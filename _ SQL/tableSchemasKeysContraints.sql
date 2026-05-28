SELECT 
    c.TABLE_NAME,
    c.COLUMN_NAME, 
    c.DATA_TYPE, 
    c.CHARACTER_MAXIMUM_LENGTH,
    tc.CONSTRAINT_TYPE AS KEY_TYPE,
    kcu.CONSTRAINT_NAME
FROM 
    INFORMATION_SCHEMA.COLUMNS c
LEFT JOIN 
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu 
    ON c.TABLE_SCHEMA = kcu.TABLE_SCHEMA
    AND c.TABLE_NAME = kcu.TABLE_NAME 
    AND c.COLUMN_NAME = kcu.COLUMN_NAME
LEFT JOIN 
    INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc 
    ON kcu.TABLE_SCHEMA = tc.TABLE_SCHEMA
    AND kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME 
    AND kcu.TABLE_NAME = tc.TABLE_NAME
WHERE 
    c.TABLE_NAME IN (
        'AA_AuditRoom',
        'AA_AuditTeam',
        'AA_ltbAuditStatus',
        'AA_ltbAuditType',
        'AA_ltbObservationModes',
        'AA_ltbObservationModesDetails',
        'AA_ltbObservationStatus',
        'AA_ltbObservationType',
        'AA_ltbRights',
        'AA_ltbTypeStatusPairs',
        'AA_Observations',
        'aa_protocols'
    )
ORDER BY 
    c.TABLE_NAME,
    c.ORDINAL_POSITION;