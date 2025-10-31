-- Increase precision of confidence_score column to support combined authority + relevance scores
-- Change from NUMERIC(3,2) (max 9.99) to NUMERIC(4,2) (max 99.99)
ALTER TABLE dead_link_replacements 
ALTER COLUMN confidence_score TYPE NUMERIC(4,2);