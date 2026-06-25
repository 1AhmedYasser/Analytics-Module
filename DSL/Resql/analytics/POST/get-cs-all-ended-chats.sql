WITH rating_config AS (
    SELECT value AS is_five_rating_scale
    FROM configuration
    WHERE key = 'isFiveRatingScale'
      AND "domain" IS NULL
      AND NOT deleted
    ORDER BY id DESC
    LIMIT 1
),
TitleVisibility AS (
    SELECT value
    FROM configuration
    WHERE key = 'is_csa_title_visible'
      AND NOT deleted
    ORDER BY id DESC
    LIMIT 1
),
ChatUser AS (
    SELECT DISTINCT ON (id_code)
        id_code,
        display_name,
        first_name,
        last_name
    FROM "user"
    ORDER BY id_code, id DESC
),
MaxChats AS (
    SELECT MAX(c.id) AS maxId, c.base_id
    FROM chat c
    WHERE ended IS NOT NULL
      AND status = 'ENDED'
      AND (
        array_length(ARRAY[:urls]::TEXT[], 1) IS NULL
        OR c.end_user_url LIKE ANY(ARRAY[:urls]::TEXT[])
      )
      AND (
        :showTest = TRUE
        OR c.test = FALSE
      )
      AND c.ended::timestamptz BETWEEN :start::timestamptz AND :end::timestamptz
      AND (
        (c.feedback_rating_five IS NOT NULL AND c.feedback_rating_five <= 3)
        OR
        (c.feedback_rating IS NOT NULL AND c.feedback_rating <= 5)
      )
    GROUP BY base_id
),
EndedChatMessages AS (
    SELECT
        c.base_id,
        c.customer_support_id,
        c.customer_support_display_name,
        c.csa_title,
        c.end_user_id,
        c.end_user_first_name,
        c.end_user_last_name,
        c.end_user_email,
        c.end_user_phone,
        c.end_user_os,
        c.end_user_url,
        c.status,
        c.updated,
        c.ended,
        c.forwarded_to_name,
        c.received_from,
        c.labels,
        c.created,
        c.feedback_text,
        c.feedback_rating,
        c.feedback_rating_five,
        c.preserve
    FROM chat c
    RIGHT JOIN MaxChats ON c.id = MaxChats.maxId
),
MaxChatHistoryComments AS (
    SELECT MAX(id) AS maxId
    FROM chat_history_comments
    WHERE chat_id IN (SELECT base_id FROM MaxChats)
    GROUP BY chat_id
),
ChatHistoryComments AS (
    SELECT
        comment,
        chat_id,
        created,
        author_display_name
    FROM chat_history_comments
    JOIN MaxChatHistoryComments ON id = maxId
),
MessageAgg AS (
    SELECT
        m.chat_base_id,
        MAX(m.id) AS maxId,
        MAX(CASE WHEN m.content <> '' AND m.content <> 'message-read' THEN m.id END) AS maxContentId,
        MIN(CASE WHEN m.content <> '' AND m.content <> 'message-read' THEN m.id END) AS minContentId,
        MAX(CASE WHEN m.event = 'contact-information-fulfilled' THEN m.id END) AS fulfilledId
    FROM message m
    WHERE m.chat_base_id IN (SELECT base_id FROM MaxChats)
    GROUP BY m.chat_base_id
),
FirstContentMessage AS (
    SELECT m.created, m.chat_base_id
    FROM message m
    JOIN MessageAgg ON m.id = MessageAgg.minContentId
),
LastContentMessage AS (
    SELECT m.content, m.chat_base_id
    FROM message m
    JOIN MessageAgg ON m.id = MessageAgg.maxContentId
),
ContactsMessage AS (
    SELECT m.chat_base_id, m.content
    FROM message m
    JOIN MessageAgg ON m.id = MessageAgg.fulfilledId
),
Messages AS (
    SELECT m.event, m.updated, m.chat_base_id, m.author_id
    FROM message m
    JOIN MessageAgg ON m.id = MessageAgg.maxId
),
RatedChats AS (
    SELECT
        CASE
            WHEN (SELECT COALESCE(is_five_rating_scale, 'false') = 'true' FROM rating_config)
            THEN MAX(c.feedback_rating_five)
            ELSE MAX(c.feedback_rating)
        END AS rating
    FROM chat c
    WHERE c.base_id IN (SELECT base_id FROM MaxChats)
      AND CASE
        WHEN (SELECT COALESCE(is_five_rating_scale, 'false') = 'true' FROM rating_config)
        THEN c.feedback_rating_five IS NOT NULL
        ELSE c.feedback_rating IS NOT NULL
      END
    GROUP BY c.base_id
),
RatedChatsCount AS (
    SELECT COUNT(rating) AS total FROM RatedChats
),
Promoters AS (
    SELECT COUNT(rating) AS p FROM RatedChats WHERE rating >= 9
),
Detractors AS (
    SELECT COUNT(rating) AS d FROM RatedChats WHERE rating <= 6
),
NPS AS (
    SELECT ROUND(((p / (GREATEST(total, 1) * 1.0)) - (d / (GREATEST(total, 1) * 1.0))) * 100.0, 2) AS nps
    FROM RatedChatsCount
    CROSS JOIN Promoters
    CROSS JOIN Detractors
),
LatestOpenChat AS (
    SELECT DISTINCT ON (chat.base_id)
        chat.base_id,
        chat.customer_support_id AS latest_open_csa
    FROM chat
    JOIN MaxChats ON MaxChats.base_id = chat.base_id
    WHERE chat.status = 'OPEN'
    ORDER BY chat.base_id, chat.id DESC
),
CSAFullNames AS (
    SELECT
        c2.base_id,
        ARRAY_AGG(DISTINCT TRIM(
            CASE
                WHEN c2.customer_support_id = :csaId THEN c2.customer_support_display_name
                ELSE COALESCE(NULLIF(TRIM(cu.first_name || ' ' || cu.last_name), ''), cu.display_name)
            END
        )) FILTER (
            WHERE NOT (
                c2.customer_support_id = :csaId
                AND (lo.latest_open_csa IS NULL OR lo.latest_open_csa <> :csaId)
            )
        ) AS all_csa_names,
        ARRAY_AGG(DISTINCT c2.customer_support_id) FILTER (
            WHERE NOT (
                c2.customer_support_id = :csaId
                AND (lo.latest_open_csa IS NULL OR lo.latest_open_csa <> :csaId)
            )
        ) AS all_csa_ids
    FROM chat c2
    JOIN MaxChats ON MaxChats.base_id = c2.base_id
    LEFT JOIN ChatUser cu ON cu.id_code = c2.customer_support_id
    LEFT JOIN LatestOpenChat lo ON lo.base_id = c2.base_id
    GROUP BY c2.base_id
)
SELECT
    c.base_id AS id,
    c.customer_support_id,
    c.customer_support_display_name,
    (CASE WHEN TitleVisibility.value = 'true' THEN c.csa_title ELSE '' END) AS csa_title,
    c.end_user_id,
    c.end_user_first_name,
    c.end_user_last_name,
    c.end_user_email,
    c.end_user_phone,
    c.end_user_os,
    c.end_user_url,
    c.status,
    FirstContentMessage.created,
    c.updated,
    c.ended,
    c.forwarded_to_name,
    c.received_from,
    c.labels,
    s.comment,
    s.created as comment_added_date,
    s.author_display_name as comment_author,
    mu.display_name AS user_display_name,
    cu.first_name AS customer_support_first_name,
    cu.last_name AS customer_support_last_name,
    LastContentMessage.content AS last_message,
    (CASE WHEN m.event = '' THEN NULL ELSE LOWER(m.event) END) AS last_message_event,
    ContactsMessage.content AS contacts_message,
    m.updated AS last_message_timestamp,
    c.feedback_text,
    COALESCE(c.feedback_rating_five, c.feedback_rating) AS feedback_rating,
    CASE
        WHEN c.feedback_rating_five IS NOT NULL THEN 'true'
        WHEN c.feedback_rating IS NOT NULL THEN 'false'
        ELSE NULL
    END AS is_five_rating_scale,
    c.preserve as is_preserve,
    nps,
    CSAFullNames.all_csa_names AS all_csa,
    COUNT(*) OVER() AS total_count,
    CEIL(COUNT(*) OVER() / :page_size::DECIMAL) AS total_pages
FROM EndedChatMessages AS c
JOIN Messages AS m ON c.base_id = m.chat_base_id
LEFT JOIN ChatHistoryComments AS s ON s.chat_id = m.chat_base_id
LEFT JOIN ChatUser AS mu ON mu.id_code = m.author_id
LEFT JOIN ChatUser AS cu ON cu.id_code = c.customer_support_id
JOIN LastContentMessage ON c.base_id = LastContentMessage.chat_base_id
JOIN FirstContentMessage ON c.base_id = FirstContentMessage.chat_base_id
LEFT JOIN ContactsMessage ON ContactsMessage.chat_base_id = c.base_id
LEFT JOIN CSAFullNames ON CSAFullNames.base_id = c.base_id
CROSS JOIN TitleVisibility
CROSS JOIN NPS
WHERE (
    (
        COALESCE(:customerSupportIds, '') = ''
        OR EXISTS (
            SELECT 1
            FROM unnest(COALESCE(CSAFullNames.all_csa_ids, ARRAY[]::text[])) AS id
            WHERE id = ANY(string_to_array(:customerSupportIds, ','))
        )
        OR ('-' = ANY(string_to_array(:customerSupportIds, ',')) AND array_length(CSAFullNames.all_csa_ids, 1) = 1 AND CSAFullNames.all_csa_ids[1] = '')
    )
    AND (
        :search IS NULL OR :search = ''
        OR LOWER(c.customer_support_display_name) LIKE LOWER('%' || :search || '%')
        OR LOWER(c.end_user_first_name) LIKE LOWER('%' || :search || '%')
        OR LOWER(ContactsMessage.content) LIKE LOWER('%' || :search || '%')
        OR LOWER(s.comment) LIKE LOWER('%' || :search || '%')
        OR LOWER(c.status) LIKE LOWER('%' || :search || '%')
        OR LOWER(m.event) LIKE LOWER('%' || :search || '%')
        OR LOWER(c.base_id) LIKE LOWER('%' || :search || '%')
        OR TO_CHAR(FirstContentMessage.created, 'DD.MM.YYYY HH24:MI:SS') LIKE '%' || :search || '%'
        OR TO_CHAR(c.ended, 'DD.MM.YYYY HH24:MI:SS') LIKE '%' || :search || '%'
        OR EXISTS (
            SELECT 1
            FROM message AS msg
            WHERE msg.chat_base_id = c.base_id
            AND LOWER(msg.content) LIKE LOWER('%' || :search || '%')
        )
    )
)
ORDER BY
    CASE WHEN :sorting = 'created asc' THEN FirstContentMessage.created END ASC,
    CASE WHEN :sorting = 'created desc' THEN FirstContentMessage.created END DESC,
    CASE WHEN :sorting = 'ended asc' THEN c.ended END ASC,
    CASE WHEN :sorting = 'ended desc' THEN c.ended END DESC,
    CASE WHEN :sorting = 'customerSupportDisplayName asc' THEN c.customer_support_display_name END ASC,
    CASE WHEN :sorting = 'customerSupportDisplayName desc' THEN c.customer_support_display_name END DESC,
    CASE WHEN :sorting = 'endUserName asc' THEN c.end_user_first_name END ASC,
    CASE WHEN :sorting = 'endUserName desc' THEN c.end_user_first_name END DESC,
    CASE WHEN :sorting = 'endUserEmail asc' THEN c.end_user_email END ASC,
    CASE WHEN :sorting = 'endUserEmail desc' THEN c.end_user_email END DESC,
    CASE WHEN :sorting = 'endUserId asc' THEN c.end_user_id END ASC,
    CASE WHEN :sorting = 'endUserId desc' THEN c.end_user_id END DESC,
    CASE WHEN :sorting = 'contactsMessage asc' THEN ContactsMessage.content END ASC,
    CASE WHEN :sorting = 'contactsMessage desc' THEN ContactsMessage.content END DESC,
    CASE WHEN :sorting = 'comment asc' THEN s.comment END ASC,
    CASE WHEN :sorting = 'comment desc' THEN s.comment END DESC,
    CASE WHEN :sorting = 'labels asc' THEN c.labels END ASC,
    CASE WHEN :sorting = 'labels desc' THEN c.labels END DESC,
    CASE WHEN :sorting = 'status asc' THEN
        CASE WHEN m.event IS NULL OR m.event = '' THEN NULL ELSE m.event END
    END ASC NULLS LAST,
    CASE WHEN :sorting = 'status desc' THEN
        CASE WHEN m.event IS NULL OR m.event = '' THEN NULL ELSE m.event END
    END DESC NULLS LAST,
    CASE WHEN :sorting = 'feedbackRating desc' THEN COALESCE(c.feedback_rating_five, c.feedback_rating) END DESC NULLS LAST,
    CASE WHEN :sorting = 'feedbackRating asc' THEN COALESCE(c.feedback_rating_five, c.feedback_rating) END ASC NULLS LAST,
    CASE WHEN :sorting = 'customerSupportFullName asc' THEN
        COALESCE(NULLIF(array_to_string(CSAFullNames.all_csa_names, ', '), ''),
                CASE WHEN c.customer_support_id = 'chatbot' THEN 'Bürokratt' END)
    END ASC NULLS LAST,
    CASE WHEN :sorting = 'customerSupportFullName desc' THEN
        COALESCE(NULLIF(array_to_string(CSAFullNames.all_csa_names, ', '), ''),
                CASE WHEN c.customer_support_id = 'chatbot' THEN 'Bürokratt' END)
    END DESC NULLS LAST,
    CASE WHEN :sorting = 'id asc' THEN c.base_id END ASC,
    CASE WHEN :sorting = 'id desc' THEN c.base_id END DESC
OFFSET ((GREATEST(:page, 1) - 1) * :page_size) LIMIT :page_size;
