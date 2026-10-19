/**
 * Tool / Function definitions for Dev Bot AI Assistant
 */

export const PUBLIC_TOOL_DEFINITIONS = [
  {
    name: 'searchApprovedPujas',
    description: 'Searches the database of approved Durga Puja pandals by name, locality, category, or address keywords.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Keyword search term (e.g. pandal name, landmark, road)',
        },
        locality: {
          type: 'string',
          description: 'Neighborhood or zone (e.g. "North Kolkata", "South Kolkata", "Salt Lake", "Kalyani", "Naihati")',
        },
        category: {
          type: 'string',
          description: 'Category: "Traditional / Heritage", "Theme / Contemporary", "Community / Baroari", "Bonedi Bari / Household"',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default 5, max 15)',
        },
      },
    },
  },
  {
    name: 'findNearbyPujas',
    description: 'Finds approved Durga Puja pandals near given geographic coordinates [longitude, latitude].',
    parameters: {
      type: 'object',
      properties: {
        lng: {
          type: 'number',
          description: 'Longitude coordinate (e.g. 88.3639)',
        },
        lat: {
          type: 'number',
          description: 'Latitude coordinate (e.g. 22.5726)',
        },
        maxDistanceMeters: {
          type: 'number',
          description: 'Search radius in meters (default 5000, max 25000)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default 5)',
        },
      },
      required: ['lng', 'lat'],
    },
  },
  {
    name: 'getPujaDetails',
    description: 'Retrieves comprehensive factual details, images, live crowd estimate, and queue times for a specific pandal.',
    parameters: {
      type: 'object',
      properties: {
        slugOrName: {
          type: 'string',
          description: 'Exact or partial name, or URL slug of the pandal (e.g. "bagbazar-sarbojanin-durgotsav" or "Bagbazar")',
        },
      },
      required: ['slugOrName'],
    },
  },
  {
    name: 'getPujaCrowdStatus',
    description: 'Fetches real-time crowd level (Low/Moderate/Heavy), estimated wait minutes, and observation freshness for a pandal.',
    parameters: {
      type: 'object',
      properties: {
        slugOrName: {
          type: 'string',
          description: 'Pandal name or slug',
        },
      },
      required: ['slugOrName'],
    },
  },
];

export const ADMIN_TOOL_DEFINITIONS = [
  ...PUBLIC_TOOL_DEFINITIONS,
  {
    name: 'parsePujaImport',
    description: 'Parses raw text or pasted list of pandals into a structured validation preview for the administrator.',
    parameters: {
      type: 'object',
      properties: {
        rawPandalText: {
          type: 'string',
          description: 'Raw text containing pandal entries (CSV, line delimited, or delimiter separated)',
        },
      },
      required: ['rawPandalText'],
    },
  },
  {
    name: 'confirmImportJob',
    description: 'Executes the confirmed database write for a previously generated import job ID.',
    parameters: {
      type: 'object',
      properties: {
        jobId: {
          type: 'string',
          description: 'The import job ID from parsePujaImport (e.g. "job_1729..._...")',
        },
      },
      required: ['jobId'],
    },
  },
  {
    name: 'searchExistingPujas',
    description: 'Searches across all pandal records in the database, including pending, approved, and rejected records.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Pandal name or search keyword',
        },
        status: {
          type: 'string',
          description: 'Status filter: "approved", "pending", "rejected", or "all"',
        },
      },
    },
  },
];
