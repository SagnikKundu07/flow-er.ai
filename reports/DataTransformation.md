# Wide World Importers (WWI) – Data Transformation Documentation

## 1. Overview

This document outlines the data transformation steps performed in Power Query for the Wide World Importers (WWI) dataset. The transformations were applied to ensure data consistency, standardization, and readiness for analytical reporting in Power BI.

The overall objective was to prepare a clean and optimized data model aligned with a star schema design, enabling accurate reporting and efficient query performance.

## 2. Dimension Tables

### 2.1 DimEmployee

#### Transformations Applied
- Promoted the first row as column headers.
- Defined appropriate data types:
  - Key columns assigned as Integer.
  - Name and descriptive columns assigned as Text.
  - Date fields assigned as DateTime.
- Converted the `Is Salesperson` column from Integer to Boolean.
- Removed unnecessary columns:
  - Photo
  - Valid From
  - Valid To

### 2.2 DimCustomer

#### Transformations Applied
- Initially assigned all columns as Text.
- Removed the first row containing redundant header information.
- Promoted the next row as column headers.
- Converted data types:
  - Key columns to Integer.
  - Descriptive fields to Text.
  - Credit Limit to Currency.
- Cleaned the `Credit Limit` column:
  - Removed unwanted characters (`"? "`).
  - Replaced error values with 0.
- Removed unnecessary columns:
  - Valid From
  - Valid To

### 2.3 DimStockItem

#### Transformations Applied
- Assigned all columns as Text initially.
- Removed the first row containing redundant header information.
- Promoted headers.
- Converted data types:
  - Key fields to Integer.
  - Numeric attributes to appropriate numeric types.
  - Price-related columns to Currency.
- Converted `Is Chiller Stock` to Boolean.
- Cleaned `Recommended Retail Price`:
  - Removed invalid characters (`"? "`).
  - Replaced errors with 0.
- Removed unnecessary columns:
  - Photo
  - Discount

### 2.4 DimCity

#### Transformations Applied
- Removed the incorrect initial header row.
- Promoted proper headers.
- Converted data types:
  - Key columns to Integer.
  - Geographic attributes to Text.
  - Population values to Integer.

### 2.5 DimDate

#### Transformations Applied
- Promoted headers.
- Converted the `Date` column using locale settings (en-US) to ensure correct parsing.
- Assigned appropriate numeric types to:
  - Fiscal Year
  - Fiscal Month Number
  - ISO Week Number
  - Calendar Year
  - Calendar Month Number
  - Day-related attributes

## 3. Fact Table

### 3.1 FactSale

#### Transformations Applied
- Promoted headers.
- Converted data types:
  - Keys to Integer.
  - Text fields to Text.
  - Quantitative measures (Sales, Profit, Tax) to Numeric types.
- Converted date columns using locale settings:
  - Invoice Date Key to Date.
  - Delivery Date Key to Date.

## 4. Data Preparation Strategy

The following data preparation techniques were consistently applied across all tables:

- Header standardization through promotion of column headers.
- Data type enforcement to ensure consistency and accuracy.
- Removal of unnecessary or unused columns to optimize the data model.
- Data cleansing to handle invalid characters and error values.
- Locale-based corrections for date fields to prevent parsing errors.

## 5. Outcome

The transformation process resulted in clean and well-structured star schema model.
Improved data accuracy and reliability and optimized dataset ready for advanced analytics and visualization.