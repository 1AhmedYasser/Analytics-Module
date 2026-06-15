WITH latest_per_base AS (
    SELECT DISTINCT ON (c.base_id)
    c.base_id,
    c.ended,
    c.test,
    c.end_user_url
FROM chat c
WHERE c.status = 'ENDED'
  AND c.ended::timestamptz BETWEEN :start::timestamptz AND :end::timestamptz
ORDER BY c.base_id, c.updated DESC
),
csa_chats AS (
    SELECT lp.base_id, lp.ended
    FROM latest_per_base lp
    WHERE (:showTest = TRUE OR lp.test = FALSE)
      AND (
        array_length(ARRAY[:urls]::TEXT[], 1) IS NULL
        OR lp.end_user_url LIKE ANY(ARRAY[:urls]::TEXT[])
      )
      AND EXISTS (
        SELECT 1 FROM message m
        WHERE m.chat_base_id = lp.base_id
          AND m.author_role = 'backoffice-user'
      )
      AND EXISTS (
        SELECT 1 FROM message m
        WHERE m.chat_base_id = lp.base_id
          AND (m.event = 'taken-over' OR m.event = 'pending-assigned')
      )
),
latest_user AS (
    SELECT DISTINCT ON (id_code)
    id_code, display_name, first_name, last_name
    FROM "user"
    ORDER BY id_code, id DESC
),
last_known_csa AS (
    SELECT DISTINCT ON (m.chat_base_id)
    m.chat_base_id,
    u.display_name,
    u.first_name,
    u.last_name,
    u.id_code
FROM message m
JOIN latest_user u ON u.id_code = m.author_id
WHERE m.author_role = 'backoffice-user'
  AND m.author_id IS NOT NULL
  AND m.author_id <> ''
  AND m.author_id <> 'null'
ORDER BY m.chat_base_id, m.created DESC
),
FinalData AS (
    SELECT
        date_trunc(:metric, cc.ended AT TIME ZONE :timezone) AT TIME ZONE :timezone AS date_time,
        cc.base_id AS chat_base_id,
        COALESCE(lkc.id_code, 'unknown') AS csa_id,
        COALESCE(lkc.display_name, 'Unknown') AS display_name,
        lkc.first_name,
        lkc.last_name
    FROM csa_chats cc
    LEFT JOIN last_known_csa lkc ON lkc.chat_base_id = cc.base_id
    WHERE COALESCE(lkc.id_code, 'unknown') NOT IN (:excluded_csas)
)
SELECT
    date_time,
    MAX(display_name) AS customer_support_display_name,
    csa_id AS customer_support_id,
    COALESCE(MAX(first_name || ' ' || last_name), 'Unknown') AS customer_support_full_name,
    COUNT(DISTINCT chat_base_id) AS count
FROM FinalData
GROUP BY date_time, csa_id
ORDER BY date_time ASC;
