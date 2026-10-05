export type YahooLiveQuote = {
  symbol: string;
  price: number;
  change: number | null;
  changePercent: number | null;
};

export const YAHOO_LIVE_STREAM_URL = "wss://streamer.finance.yahoo.com";

function readVarint(
  bytes: Uint8Array,
  offset: number
): { value: number; offset: number } {
  let value = 0;
  let shift = 0;
  let pos = offset;
  while (pos < bytes.length) {
    const byte = bytes[pos];
    pos += 1;
    if (shift <= 28) value += (byte & 0x7f) * 2 ** shift;
    if ((byte & 0x80) === 0) return { value, offset: pos };
    shift += 7;
  }
  return { value, offset: pos };
}

/** Decode one Yahoo live-stream pricing frame (base64 protobuf). */
export function decodeYahooPricingData(payload: string): YahooLiveQuote | null {
  let binary: string;
  try {
    binary = atob(payload);
  } catch {
    return null;
  }

  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  let symbol = "";
  let price: number | null = null;
  let change: number | null = null;
  let changePercent: number | null = null;
  let offset = 0;
  const view = new DataView(bytes.buffer);

  while (offset < bytes.length) {
    const key = readVarint(bytes, offset);
    offset = key.offset;
    const field = key.value >>> 3;
    const wire = key.value & 7;

    if (wire === 0) {
      offset = readVarint(bytes, offset).offset;
    } else if (wire === 1) {
      offset += 8;
    } else if (wire === 5) {
      if (offset + 4 > bytes.length) break;
      const float = view.getFloat32(offset, true);
      offset += 4;
      if (!Number.isFinite(float)) continue;
      if (field === 2) price = float;
      else if (field === 8) changePercent = float;
      else if (field === 12) change = float;
    } else if (wire === 2) {
      const length = readVarint(bytes, offset);
      offset = length.offset;
      const end = offset + length.value;
      if (end > bytes.length) break;
      if (field === 1) {
        symbol = new TextDecoder().decode(bytes.subarray(offset, end));
      }
      offset = end;
    } else {
      break;
    }
  }

  if (!symbol || price == null || price <= 0) return null;
  return { symbol, price, change, changePercent };
}
