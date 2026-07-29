INSERT INTO user_overview_date_preference (user_id_code, unit)
VALUES (:user_id_code, :unit)
ON CONFLICT (user_id_code)
DO UPDATE SET
    unit = EXCLUDED.unit
RETURNING user_id_code, unit;
