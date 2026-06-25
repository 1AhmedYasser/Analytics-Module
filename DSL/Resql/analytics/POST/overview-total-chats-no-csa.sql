WITH latest_per_base AS (
    SELECT DISTINCT ON (c.base_id)
    c.base_id,
    c.end_user_url,
    date_trunc(:group_period, c.ended AT TIME ZONE :timezone) AS ended,
    c.test
FROM chat c
WHERE EXISTS (
    SELECT 1
    FROM message
    WHERE message.chat_base_id = c.base_id
  AND message.author_role = 'end-user'
    )
  AND NOT EXISTS (
    SELECT 1
    FROM message
    WHERE message.chat_base_id = c.base_id
  AND message.author_role = 'backoffice-user'
    )
  AND (c.ended AT TIME ZONE :timezone) >= date_trunc(
    :group_period,
    (current_date AT TIME ZONE :timezone - concat('1 ', :group_period)::INTERVAL)
    )
ORDER BY c.base_id, c.updated DESC
    ),
    chats AS (
SELECT lp.base_id, lp.ended, lp.end_user_url
FROM latest_per_base lp
WHERE (:showTest = TRUE OR lp.test = FALSE)
  AND (
    array_length(ARRAY[:urls]::text[], 1) IS NULL
    OR (array_length(ARRAY[:urls]::text[], 1) = 1 AND (ARRAY[:urls]::text[])[1] = 'none')
    OR lp.end_user_url LIKE ANY(ARRAY[:urls]::text[])
))
SELECT timescale.ended AS ended,
       COUNT(DISTINCT base_id) AS metric_value
FROM (
         SELECT date_trunc(:group_period, period) AS ended
         FROM generate_series(
             (current_date AT TIME ZONE :timezone - concat('1 ', :group_period)::INTERVAL),
             (current_date AT TIME ZONE :timezone),
             concat('1 ', :group_period)::INTERVAL
         ) AS period
     ) AS timescale
         LEFT JOIN chats ON chats.ended = timescale.ended
GROUP BY 1
ORDER BY 1 DESC;
