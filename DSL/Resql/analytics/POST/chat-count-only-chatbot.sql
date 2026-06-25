WITH latest_per_base AS (
    SELECT DISTINCT ON (c.base_id) c.*
FROM chat c
WHERE c.status = 'ENDED'
  AND c.ended::timestamptz BETWEEN :start::timestamptz AND :end::timestamptz
    ORDER BY c.base_id, c.updated DESC
),
csa_ids AS (
  SELECT DISTINCT base_id
  FROM latest_per_base lp
  WHERE EXISTS (
    SELECT 1 FROM message m
    WHERE m.chat_base_id = lp.base_id
      AND m.author_role = 'backoffice-user'
  )
  AND EXISTS (
    SELECT 1 FROM message m
    WHERE m.chat_base_id = lp.base_id
      AND (m.event = 'taken-over' OR m.event = 'pending-assigned')
  )
)
SELECT
    DATE_TRUNC(:period, lp.ended AT TIME ZONE :timezone) AT TIME ZONE :timezone AS time,
    COUNT(*) AS count
FROM latest_per_base lp
WHERE (:showTest = TRUE OR lp.test = FALSE)
  AND (
    array_length(ARRAY[:urls]::TEXT[], 1) IS NULL
    OR lp.end_user_url LIKE ANY(ARRAY[:urls]::TEXT[])
  )
  AND NOT EXISTS (
    SELECT 1 FROM csa_ids c
    WHERE c.base_id = lp.base_id
  )
GROUP BY time
ORDER BY time ASC;
