import { normalizeCountry, normalizePostalCode, normalizeRegion } from './normalize.js';

function blank(value) {
  return value == null || String(value).trim() === '';
}

/* Stored regions are normalized per country; without a country, accept US then Canadian names. */
function regionFor(region, country) {
  if (country) return normalizeRegion(region, country);
  const us = normalizeRegion(region, 'US');
  const upper = String(region).toUpperCase().replace(/\./g, '').trim();
  return us !== upper ? us : normalizeRegion(region, 'CA');
}

/* Without a country, read US ZIPs and Canadian postal codes by shape; leave anything else as typed. */
function postalCountryFor(postalCode, country) {
  if (country) return country;
  if (/^\d{5}(-?\d{4})?$/.test(postalCode)) return 'US';
  if (/^[A-Z]\d[A-Z] ?\d[A-Z]\d$/.test(postalCode)) return 'CA';
  return null;
}

function equals(column, value) {
  return {
    type: 'EQUALS',
    values: [{ ref: { column } }, { value: { value } }]
  };
}

export const addresses = {
  title: 'Addresses',
  description:
    'People with an address in a region (state / province) and/or postal code. One value per field; combine several with an or group.',
  form: {
    title: 'Addresses',
    type: 'object',
    properties: {
      region: {
        title: 'Region',
        description: "State or province code or name, e.g. 'VA' or 'Virginia'",
        type: 'string'
      },
      postalCode: {
        title: 'Postal code',
        description: "Exact postal code, or a LIKE pattern when it contains %, e.g. '220%'",
        type: 'string'
      },
      country: {
        title: 'Country',
        description: "ISO country code or name, e.g. 'US'. Optional; narrows the match and how region and postal code are read.",
        type: 'string'
      }
    },
    required: []
  },
  optionsToEQL(options = {}) {
    const { region, postalCode, country: countryOption } = options;
    const conditions = [];
    const text = [];
    const country = blank(countryOption) ? null : normalizeCountry(countryOption);
    if (!blank(region)) {
      const value = regionFor(region, country);
      conditions.push(equals('region', value));
      text.push(`in ${value}`);
    }
    if (!blank(postalCode)) {
      const raw = String(postalCode).trim().toUpperCase();
      if (raw.includes('%')) {
        conditions.push({
          type: 'LIKE',
          values: [{ ref: { column: 'postal_code' } }, { value: { value: raw } }]
        });
        text.push(`with postal code matching ${raw}`);
      } else {
        const value = normalizePostalCode(raw, postalCountryFor(raw, country));
        conditions.push(equals('postal_code', value));
        text.push(`with postal code ${value}`);
      }
    }
    if (country) {
      conditions.push(equals('country', country));
      text.push(`in country ${country}`);
    }
    return {
      text: ['Has an address', ...text].join(' '),
      eql: {
        table: 'person_address',
        columns: ['person_id'],
        conditions
      }
    };
  }
};

export const segmentDefinitionClauses = { addresses };
export default {
  segmentDefinitionClauses
};
