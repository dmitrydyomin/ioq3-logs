import { Service } from 'typedi';

import { ParsedClientInfo } from './players/PlayerTypes';
import { ParsedItem } from './items/ItemTypes';
import { ParsedKill } from './kills/KillTypes';

export type ParserResult = ParsedKill | ParsedItem | ParsedClientInfo;

export function isKill(r: ParserResult): r is ParsedKill {
  return (r as ParsedKill).weapon !== undefined;
}

export function isItem(r: ParserResult): r is ParsedItem {
  return (r as ParsedItem).item !== undefined;
}

export function isClientInfo(r: ParserResult): r is ParsedClientInfo {
  return (r as ParsedClientInfo).name !== undefined;
}

@Service()
export class Parser {
  private parseKill(s: string): ParsedKill {
    const m = s.match(/(\d+) (\d+) (\d+)/);
    if (!m) {
      throw new Error(`Failed to parse kill: ${s}`);
    }
    return {
      killer_client_id: parseInt(m[1]),
      player_client_id: parseInt(m[2]),
      weapon: parseInt(m[3]),
    };
  }

  private parseItem(s: string): ParsedItem {
    const m = s.match(/\s*(\d+) (.*)/);
    if (!m) {
      throw new Error(`Failed to parse item: ${s}`);
    }
    return {
      player_client_id: parseInt(m[1]),
      item: m[2],
    };
  }

  private parseClientInfo(s: string): ParsedClientInfo {
    const m = s.match(/\s*(\d+) (.*)/);
    if (!m) {
      throw new Error(`Failed to parse user info: ${s}`);
    }
    const data = m[2].split('\\');
    let options: Record<string, string> = {};
    for (let i = 0; i < data.length / 2; i++) {
      options[data[i * 2]] = data[i * 2 + 1];
    }
    return {
      client_id: parseInt(m[1]),
      model: options.model || '',
      name: options.n || '',
      options,
    };
  }

  parseLine(s: string): ParserResult | undefined {
    const [prefix, rest] = s.split(':');
    switch (prefix) {
      case 'Kill':
        return this.parseKill(rest);
      case 'Item':
        return this.parseItem(rest);
      case 'ClientUserinfoChanged':
        return this.parseClientInfo(rest);
      default:
        return undefined;
    }
  }
}
