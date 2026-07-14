WITH botname AS (
    SELECT "value"
    FROM "configuration"
    WHERE "key" = 'bot_institution_id'
    LIMIT 1
),
ended_chats AS (
    SELECT DISTINCT ON (c.base_id)
        c.base_id,
        c.test,
        c.end_user_url
    FROM chat c
    WHERE c.status = 'ENDED'
      AND c.ended::timestamptz BETWEEN :start::timestamptz AND :end::timestamptz
    ORDER BY c.base_id, c.updated DESC
),
filtered_chats AS (
    SELECT base_id
    FROM ended_chats ec
    WHERE (:showTest = TRUE OR ec.test = FALSE)
      AND (
        array_length(ARRAY[:urls]::TEXT[], 1) IS NULL
        OR (array_length(ARRAY[:urls]::TEXT[], 1) = 1 AND (ARRAY[:urls]::TEXT[])[1] = 'none')
        OR ec.end_user_url LIKE ANY(ARRAY[:urls]::TEXT[])
      )
),
csa_per_chat AS (
    SELECT c.base_id,
        COUNT(DISTINCT c.customer_support_id) AS distinct_csa_count
    FROM chat c
    JOIN filtered_chats fc ON fc.base_id = c.base_id
    WHERE c.customer_support_id IS NOT NULL
      AND c.customer_support_id <> ''
      AND c.customer_support_id NOT IN (SELECT "value" FROM botname)
    GROUP BY c.base_id
)
SELECT
    COUNT(*) FILTER (WHERE distinct_csa_count > 1) AS multi_csa_chats,
    COUNT(*) AS total_csa_chats
FROM csa_per_chat;
