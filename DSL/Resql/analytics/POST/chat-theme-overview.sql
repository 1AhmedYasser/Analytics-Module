WITH latest_per_base AS (
    SELECT DISTINCT ON (c.base_id) c.*
    FROM chat c
    WHERE c.status = 'ENDED'
      AND c.ended::timestamptz BETWEEN :start::timestamptz AND :end::timestamptz
    ORDER BY c.base_id, c.updated DESC
),
latest_theme_times AS (
    SELECT chat_base_id, MAX(created_at) AS latest_at
    FROM chat_measurements
    WHERE type = 'THEME'
    GROUP BY chat_base_id
),
current_themes AS (
    SELECT cm.*
    FROM chat_measurements cm
    JOIN latest_theme_times ltt ON cm.chat_base_id = ltt.chat_base_id
        AND cm.created_at = ltt.latest_at
    WHERE cm.type = 'THEME'
)
SELECT
    cm.value AS theme,
    COUNT(DISTINCT lp.base_id) AS count
FROM latest_per_base lp
JOIN current_themes cm ON cm.chat_base_id = lp.base_id::uuid
WHERE (:showTest = TRUE OR lp.test = FALSE)
  AND (
    array_length(ARRAY[:urls]::TEXT[], 1) IS NULL
    OR lp.end_user_url LIKE ANY(ARRAY[:urls]::TEXT[])
  )
  AND cm.value IS NOT NULL
  AND cm.value <> ''
  AND cm.value NOT IN (:excluded_themes)
GROUP BY cm.value
ORDER BY count DESC, cm.value ASC;
