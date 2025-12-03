# Sample Excel Files

This directory contains sample Excel files to test the Schema Analyzer.

## Sample 1: Sales Report (sales-data.xlsx)
**Features demonstrated:**
- Multi-level headers (merged cells)
- Hierarchical dimensions (Region → City)
- Time dimensions (Q1 2024, Q2 2024)
- Numeric metrics (Revenue, Units)

**Structure:**
```
Region | Region  | Q1 2024 | Q1 2024 | Q2 2024 | Q2 2024
Region | City    | Revenue | Units   | Revenue | Units
North  | NY      | 45000   | 120     | 52000   | 145
...
```

## Sample 2: Product Inventory (inventory-data.xlsx)
**Features demonstrated:**
- Mixed data types (String, Number, Boolean, Date)
- Entity IDs (Product ID)
- Categories (Product Category)
- Timestamp columns (Last Restocked)

**Structure:**
```
Product ID | Product Name    | Category     | In Stock | Quantity | Price   | Last Restocked
P001       | Laptop Pro      | Electronics  | TRUE     | 45       | 1299.99 | 2024-11-15
...
```

## How to Use

1. Download any sample file
2. Upload it to the Excel Schema Analyzer
3. Watch the AI detect tables, infer types, and suggest semantic roles
4. Review and export the schema

These files demonstrate the tool's ability to handle:
- ✅ Complex multi-row headers
- ✅ Hierarchical relationships
- ✅ Time-based dimensions
- ✅ Multiple data types
- ✅ Business entities and metrics
