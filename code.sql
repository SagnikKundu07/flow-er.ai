-- Check for NULLs in FirstName (should not exist due to NOT NULL constraint)
SELECT EmployeeID, FirstName
FROM dbo.Employees
WHERE FirstName IS NULL;

-- Check for NULLs in LastName (should not exist due to NOT NULL constraint)
SELECT EmployeeID, LastName
FROM dbo.Employees
WHERE LastName IS NULL;

-- Check for NULLs in Email (should not exist if defined as NOT NULL or if you want to enforce it)
SELECT EmployeeID, Email
FROM dbo.Employees
WHERE Email IS NULL;

-- Check for NULLs in JobTitle (if it's a critical field that shouldn't be NULL)
SELECT EmployeeID, JobTitle
FROM dbo.Employees
WHERE JobTitle IS NULL;