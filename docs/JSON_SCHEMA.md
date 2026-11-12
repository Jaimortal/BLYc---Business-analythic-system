# BLYc Project JSON Schema Specification

Version: `1.0.0`

The BLYc JSON project file provides a portable, self-contained representation of a business analytics project, allowing complete offline reproducibility of dashboards and custom calculations.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "BLYcProject",
  "type": "object",
  "required": ["format", "schema_version", "project", "dataset", "analytics", "dashboard"],
  "properties": {
    "format": {
      "type": "string",
      "enum": ["BLYc"]
    },
    "schema_version": {
      "type": "string",
      "pattern": "^[0-9]+\\.[0-9]+\\.[0-9]+$"
    },
    "project": {
      "type": "object",
      "required": ["id", "name", "created_at", "updated_at"],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "created_at": { "type": "string", "format": "date-time" },
        "updated_at": { "type": "string", "format": "date-time" }
      }
    },
    "dataset": {
      "type": "object",
      "required": ["columns", "records"],
      "properties": {
        "metadata": { "type": "object" },
        "columns": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["name", "data_type"],
            "properties": {
              "name": { "type": "string" },
              "data_type": { "type": "string" },
              "semantic_role": { "type": "string" }
            }
          }
        },
        "records": {
          "type": "array",
          "items": { "type": "object" }
        }
      }
    },
    "data_quality": {
      "type": "object",
      "properties": {
        "issues": { "type": "array" },
        "normalization_rules": { "type": "array" },
        "cleaning_history": { "type": "array" }
      }
    },
    "analytics": {
      "type": "object",
      "properties": {
        "metrics": { "type": "object" },
        "trends": { "type": "object" },
        "comparisons": { "type": "object" }
      }
    },
    "calculations": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "formula": { "type": "string" },
          "created_at": { "type": "string" }
        }
      }
    },
    "dashboard": {
      "type": "object",
      "required": ["tabs"],
      "properties": {
        "tabs": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["id", "title", "widgets"],
            "properties": {
              "id": { "type": "string" },
              "title": { "type": "string" },
              "widgets": { "type": "array" }
            }
          }
        }
      }
    },
    "ai_context": {
      "type": "object",
      "properties": {
        "business_type": { "type": ["string", "null"] },
        "column_mappings": { "type": "object" },
        "analysis_preferences": { "type": "object" }
      }
    }
  }
}
```
