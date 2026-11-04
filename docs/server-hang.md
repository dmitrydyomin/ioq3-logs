# Investigating a server hang ("awaiting gamestate")

Symptom: clients get stuck on "awaiting gamestate" and the server only recovers after a restart. The cause is not known yet.

**Capture everything below before restarting.** Restarting the deployment replaces the pod, and its logs go with it.

## 1. Capture

Run on `c1`, ideally while someone is trying to connect.

```sh
cd /root

# Pod age and restart counts: how long had the server been up?
kubectl -n quake3 get pods | tee hang-$(date +%F-%H%M)-pods.txt

# Does the server answer status queries? Also lists connected players.
printf '\xff\xff\xff\xffgetstatus\n' | nc -u -w1 127.0.0.1 27960 | tee hang-$(date +%F-%H%M)-status.txt

# Full server output
kubectl -n quake3 logs deploy/quake > hang-$(date +%F-%H%M)-quake.log
grep -i -E 'wrapping|error|drop|hitch' hang-*-quake.log | tail -30

# Is the game process alive?
kubectl -n quake3 exec deploy/quake -- ps

# Packets while someone tries to connect. Stops after 200 packets, or press Ctrl-C.
tcpdump -ni any -c 200 udp port 27960 | tee hang-$(date +%F-%H%M)-tcpdump.txt
```

Also note:

- Does it affect everyone, or only one player?
- When did the last few hangs happen? An interval of about three weeks would be a strong clue.

## 2. Read the results

| Result | Meaning |
| --- | --- |
| `tcpdump` shows server packets of about 1300 bytes | The gamestate is being sent and lost on the way: look at the network, firewall or MTU |
| `tcpdump` shows only small server packets | The server isn't sending the gamestate: the problem is inside the server |
| Only one player is affected | Look at that player's client or network first |
| `getstatus` lists players nobody recognises as connected | Old clients may be holding slots |
| Logs contain `Restarting server due to time wrapping` | The server hit its uptime limit of about 21.7 days and reloaded the map; check whether the hang started there |
| `ioq3ded` is missing from `ps` | This is a different failure: the game process died and `pipe.js` kept the pod running |

`getstatus` is answered before any client state is involved, so a reply does not mean the server is healthy. Clients stuck on "awaiting gamestate" have already got past that stage.

For more detail, add `+set developer 1` to the quake args in `c1k3s/apps/quake3/quake3.yaml` before the next hang. The server then logs lines such as `SV_SendClientGameState()` and `dropped gamestate, resending`, which show whether it believes it sent the gamestate.

## 3. Restart

Restart quake first, then `logs`:

```sh
kubectl -n quake3 rollout restart deploy/quake
kubectl -n quake3 rollout status deploy/quake
kubectl -n quake3 rollout restart deploy/logs
```

`logs` must be restarted too. It doesn't reconnect properly after quake goes away: it prints `disconnected` then `connected`, but receives nothing, and no games are recorded until it restarts. Remove this step once the reconnect in `logs/src/Client.ts` is fixed.
