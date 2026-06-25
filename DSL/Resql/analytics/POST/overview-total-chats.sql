WITH latest_per_base AS (
    SELECT DISTINCT ON (c.base_id)
    DATE_TRUNC('day', c.ended) AS time,
    c.base_id,
    c.test,
    c.end_user_url,
    c.ended,
    c.updated
    FROM chat c
    WHERE c.status = 'ENDED'
    ORDER BY c.base_id, c.updated DESC
),
chats AS (
    SELECT lp.base_id,
        date_trunc(:group_period, lp.ended AT TIME ZONE :timezone) AS ended
    FROM latest_per_base lp
    WHERE EXISTS (
        SELECT 1
        FROM message m
        WHERE m.chat_base_id = lp.base_id
        AND m.author_role = 'end-user'
    )
    AND (:showTest = TRUE OR lp.test = FALSE)
    AND (
        array_length(ARRAY[:urls]::text[], 1) IS NULL
        OR (array_length(ARRAY[:urls]::text[], 1) = 1 AND (ARRAY[:urls]::text[])[1] = 'none')
        OR lp.end_user_url LIKE ANY(ARRAY[:urls]::text[])
    )
    AND (lp.ended AT TIME ZONE :timezone) >= date_trunc(
        :group_period,
        (current_date AT TIME ZONE :timezone - concat('1 ', :group_period)::INTERVAL)
    )
)
SELECT ts.ended,
       COUNT(DISTINCT c.base_id) AS metric_value
FROM (
    SELECT date_trunc(:group_period, period) AS ended
    FROM generate_series(
        date_trunc(:group_period, (NOW() AT TIME ZONE :timezone) - concat('1 ', :group_period)::INTERVAL),
        date_trunc(:group_period, (NOW() AT TIME ZONE :timezone)),
        concat('1 ', :group_period)::INTERVAL
    ) AS period
) ts
LEFT JOIN chats c ON c.ended = ts.ended
GROUP BY ts.ended
ORDER BY ts.ended DESC;
