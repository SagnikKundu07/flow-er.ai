# Wide World Importers (WWI) – Report Handbook

## Overview Page

### Objective
High-level summary of Sales, Profit, Quantity, and Stock performance for Wide World Importers.

### Slicers
- Fiscal Year: DimDate[Fiscal Year] (Starts from November)
- Field Parameter: Sales Territory and Buying Group

### Buttons/Icons
- Report Summarization: Summarize report visual for Page 1 using Smart Narrative
- Caution: Data quality issue indicator ~38% sales linked to Unknown customers

### KPI Measures
```
Number of Sales = COUNT(FactSale[WWI Invoice ID])
Total Sales Incl Tax = SUM(FactSale[Total Including Tax])
Total Profit = SUM(FactSale[Profit])
Total Quantity = SUM(FactSale[Quantity])
Total Stock Price = SUMX(FactSale, FactSale[Quantity] * RELATED(DimStockItem[Unit Price]))
Total Sales Excl Tax = SUM(FactSale[Total Excluding Tax])
Gross Margin % = DIVIDE([Total Profit], [Total Sales Excl Tax])
```

### Time Intelligence
```
Base Measure LY = CALCULATE([Base Measure], SAMEPERIODLASTYEAR(DimDate[Date]))
```

### Visuals
- Card Visual: At a glance section for KPI measures with corresponding Last Year value 
- Combo Chart: 
- Sales Excl Tax and Gross Margin %
    - Details:
        - X-Axis: Field Parameter
        - Column Y-Axis: Total Sales Excl Tax
        - Line Y-Axis: Gross Margin %
- Total Porfit by Sales Territory
    - Details:
        - Legend: Field Paramter
        - Values: Total Profit
- Matrix: Monthly Sales vs Last Year with YoY%
    - Details:
        - Rows: Fiscal Year, Short Month
        - Values: Total Sales Incl Tax, Total Sales Incl Tax LY, Sales Incl Tax YOY%
---

## Page 2: Sales and Profit by Region

### Objective
Analyze regional performance and trends.

### Slicers
- Fiscal Year: DimDate[Fiscal Year] (Starts from November)
- Territory: Select DimCity[Sales Territory]

### Visuals
- Filled Map: Sales (Incl Tax) and Profit by Territory
    - Details:
        - Location: State Province
        - Tooltips: Total Sales Incl Tax, Total Profit
        - Drill through: Enabled
- Scatter Chart: Sales (Incl Tax) and Profit by Territory
    - Details:
        - X-Axis: Total Sales Incl Tax
        - Y-Axis: Total Profit
        - Bubble size: Total Quantity
        - Drill through: Enabled
- Matrix: Monthly Sales Heatmap:
    - Details:
        - Rows: Sales Territory, State Province
        - Columns: Fiscal Year, Month
        - Values: Total Sales Incl Tax
        - Drill through: Enabled
        - Color Formatting Rule:
            ```
            Identify Diff Total vs Yearly Avg Sales Amount % = DIVIDE([Total Sales Incl Tax] - [Yearly Avg Sales Amount], [Yearly Avg Sales Amount])
            ```
            ```
            CF Sales Color = VAR Diff = [Diff Total vs Yearly Avg Sales Amount %]
                               RETURN
                                SWITCH(
                                    TRUE(),
                                    ISBLANK([Total Sales Incl Tax]), "#FFFFFF",
                                    Diff <= -0.90, "#D64550",   -- Red
                                    Diff <= -0.70, "#D76E32",   -- Orange
                                    Diff <= -0.60, "#D99017",   -- Chrome Yellow
                                    Diff <= -0.40, "#D9AF03",   -- Yellow
                                    Diff <= -0.20, "#99B743",   -- Light Green
                                    Diff <=  0.20, "#73B96A",   -- Green
                                    "#57BB88"                  --  Dark Green
                                )
            ```
- Table: Yearly Avg Sales: Reference table to calculate yearly average sales 
    ```
    Yearly Avg Sales = CALCULATE(AVERAGEX(VALUES(DimDate[Fiscal Month Number]), [Total Sales Incl Tax]), ALLEXCEPT(DimDate, DimDate[Fiscal Year]))
    ```

---

## Page 3: Territory Insights

### Objective
Drillthrough analysis for selected Territory and State.

### Drillthrough Fields
- Sales Territory
- State Province
- Fiscal Year

### Visuals
- Top 5 Products by Sales in State Province from Sales Territory: 
    - Total Sales Incl Tax, Stock Item (TOPN: 5)
- Top 5 Products by Stock Price in State Province from Sales Territory: 
    - Total Stock Price, Stock Item (TOPN: 5)
- Top 3 Employees by Profit Contribution in State Province from Sales Territory: 
    - Total Profit, Employee (TOPN: 3)
- Top Buying Group in State Province from Sales Territory: 
    - Total Sales Incl Tax, Buying Group (TOPN: 1)
- Top 5 Customers withing Top Buying Group in State Province from Sales Territory: 
    - Total Sales Incl Tax, Customer (TOPN: 5) 