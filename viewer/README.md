# Viewer

## 3D stats portraits

Export the Ranger and Sarge heads from your local Quake III game data.
The exporter requires Python 3.9+ and Pillow.

```sh
cd viewer
python3 scripts/export-player-heads.py /path/to/pak0.pk3
npm run dev
```

The exporter writes to `viewer/public/player-heads/`, which Git ignores.
For deployment, export to a separate directory with `--output` and mount
that directory at `/usr/share/nginx/html/player-heads` in the viewer container.
Deploy the updated logs API so the totals response includes each player's
model and skin. The viewer uses the existing player icons when a 3D portrait
is unavailable.
