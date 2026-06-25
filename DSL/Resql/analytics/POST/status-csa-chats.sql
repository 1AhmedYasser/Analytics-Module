WITH latest_chats AS (
    SELECT DISTINCT ON (chat.base_id)
        chat.base_id,
        chat.ended,
        chat.status,
        chat.end_user_url,
        chat.test
    FROM chat
    WHERE chat.ended::timestamptz BETWEEN :start::timestamptz AND :end::timestamptz
    ORDER BY chat.base_id, chat.created DESC
),
latest_messages AS (
    SELECT DISTINCT ON (message.chat_base_id)
        message.chat_base_id,
        message.event
    FROM message
    WHERE message.event IN (:events)
        AND message.author_role = 'backoffice-user'
    ORDER BY message.chat_base_id, message.created DESC
)
SELECT
    date_trunc(:metric, lc.ended) AS date_time,
    lm.event AS event,
    COUNT(DISTINCT lc.base_id) AS count
FROM latest_chats lc
    JOIN latest_messages lm
        ON lc.base_id = lm.chat_base_id
WHERE lc.status = 'ENDED'
    AND (
        array_length(ARRAY[:urls]::TEXT[], 1) IS NULL
        OR lc.end_user_url LIKE ANY(ARRAY[:urls]::TEXT[])
    )
    AND (
        :showTest = TRUE
        OR lc.test = FALSE
    )
GROUP BY date_time, event
ORDER BY event;
