WITH csa_config AS (
    SELECT "value"
    FROM "configuration"
    WHERE "key" = 'organizationUseCSA'
      AND "domain" IS NULL
      AND id IN (SELECT max(id) FROM configuration WHERE "key" = 'organizationUseCSA' AND "domain" IS NULL)
      AND NOT deleted
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
forwarded_chats AS (
    SELECT c.base_id,
        MIN(c.updated) AS forwarded_at
    FROM chat c
    JOIN filtered_chats fc ON fc.base_id = c.base_id
    WHERE c.customer_support_id = ''
    GROUP BY c.base_id
),
waiting_times AS (
    SELECT fwd.base_id,
        MIN(m.created) - fwd.forwarded_at AS waiting_time
    FROM forwarded_chats fwd
    JOIN message m ON m.chat_base_id = fwd.base_id
    WHERE m.author_role = 'backoffice-user'
      AND m.created >= fwd.forwarded_at
    GROUP BY fwd.base_id, fwd.forwarded_at
)
SELECT
    COALESCE((SELECT "value" = 'true' FROM csa_config), FALSE) AS csa_enabled,
    COALESCE(ROUND(AVG(EXTRACT(epoch FROM waiting_time))), 0) AS metric_value
FROM waiting_times;
