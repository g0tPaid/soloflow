import { BadRequestException } from '@nestjs/common';

export type ImportedShipment = {
  order: string;
  tracking: string;
  recipient: string;
  carrier: string;
  origin: string;
  destination: string;
  postcode: string;
};

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  text = text.replace(/^\uFEFF/, '').replace(/\x0d\n?/g, '\n') + '\n';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        value += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && (char === ',' || char === '\n')) {
      row.push(value.trim());
      value = '';
      if (char === '\n') {
        if (row.some(Boolean)) rows.push(row);
        row = [];
      }
    } else {
      value += char;
    }
  }
  if (quoted) throw new BadRequestException('The CSV has an unfinished quoted field.');
  return rows;
}

export function parsePartnerShipments(csv: unknown, number: string, prefix: string | null) {
  if (typeof csv !== 'string' || Buffer.byteLength(csv) > 1_000_000) {
    throw new BadRequestException('Choose a shipment CSV up to 1 MB.');
  }
  const [header, ...rows] = parseCsv(csv);
  const columns = ['customer_ref', 'customer_name', 'order_number', 'tracking_number', 'carrier', 'origin', 'destination', 'postcode'];
  if (!header || rows.length === 0 || rows.length > 500 || columns.some((column) => !header.includes(column))) {
    throw new BadRequestException('Use a Sourcing Center shipment CSV with 1 to 500 rows.');
  }
  const normalize = (value: string) => value.toUpperCase().replace(/[\s-]/g, '');
  const references = new Set([normalize((prefix ?? '') + number), normalize(number + (prefix ?? ''))]);
  return rows.map((row, index): ImportedShipment => {
    const read = (key: string) => row[header.indexOf(key)] ?? '';
    if (row.length !== header.length || !references.has(normalize(read('customer_ref')))) {
      throw new BadRequestException('CSV row ' + (index + 2) + ' does not match this dropshipper ID.');
    }
    const order = read('order_number');
    const tracking = read('tracking_number');
    if ((!order && !tracking) || columns.some((key) => read(key).length > 250)) {
      throw new BadRequestException('Check the order and tracking details on CSV row ' + (index + 2) + '.');
    }
    return {
      order, tracking, recipient: read('customer_name'), carrier: read('carrier'),
      origin: read('origin'), destination: read('destination'), postcode: read('postcode'),
    };
  });
}

export function mergeImportedShipments(current: ImportedShipment[], batch: ImportedShipment[]) {
  const key = (row: ImportedShipment) => JSON.stringify([row.order.toUpperCase(), row.tracking.toUpperCase()]);
  const merged = new Map(current.map((row) => [key(row), row]));
  for (const row of batch) merged.set(key(row), row);
  return [...merged.values()];
}
