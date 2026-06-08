WITH latest_per_base AS (
    SELECT DISTINCT ON (c.base_id) c.*
    FROM chat c
    WHERE c.status = 'ENDED'
      AND c.ended::timestamptz BETWEEN :start::timestamptz AND :end::timestamptz
    ORDER BY c.base_id, c.updated DESC
)
SELECT
    cm.value AS follow_up_action,
    COUNT(DISTINCT lp.base_id) AS count
FROM latest_per_base lp
JOIN chat_measurements cm ON cm.chat_base_id = lp.base_id::uuid
WHERE (:showTest = TRUE OR lp.test = FALSE)
  AND (
    array_length(ARRAY[:urls]::TEXT[], 1) IS NULL
    OR lp.end_user_url LIKE ANY(ARRAY[:urls]::TEXT[])
  )
  AND cm.type = 'FOLLOW_UP_ACTION'
  AND cm.value IS NOT NULL
  AND cm.value <> ''
  AND cm.value NOT IN (:excluded_actions)
GROUP BY cm.value
ORDER BY count DESC, cm.value ASC;
