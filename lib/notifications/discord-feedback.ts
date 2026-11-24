type Sentiment = 'positive' | 'neutral' | 'negative'

export interface DiscordFeedback {
  sentiment: Sentiment
  message: string
  pageUrl: string
  userEmail?: string
}

const SENTIMENT_STYLE: Record<Sentiment, { emoji: string; color: number }> = {
  positive: { emoji: '😊', color: 0x22c55e },
  neutral: { emoji: '😐', color: 0xeab308 },
  negative: { emoji: '😞', color: 0xef4444 }
}

// Discord limits: thread name 100 chars, embed description 4096, field value 1024.
function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

export function buildDiscordFeedbackPayload(data: DiscordFeedback) {
  const { emoji, color } = SENTIMENT_STYLE[data.sentiment]
  const firstLine = data.message.split('\n')[0].trim() || 'Feedback'

  return {
    // Required when the webhook points at a forum channel: creates a new post.
    thread_name: truncate(`${emoji} ${firstLine}`, 100),
    // Feedback text is user input; never let it ping @everyone, roles or users.
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: `New feedback ${emoji}`,
        description: truncate(data.message, 4096),
        color,
        fields: [
          { name: 'Sentiment', value: data.sentiment, inline: true },
          {
            name: 'From',
            value: truncate(data.userEmail || 'Anonymous', 1024),
            inline: true
          },
          { name: 'Page', value: truncate(data.pageUrl || '—', 1024) }
        ],
        timestamp: new Date().toISOString()
      }
    ]
  }
}

/**
 * Posts site feedback to the Discord forum webhook in
 * DISCORD_FEEDBACK_WEBHOOK_URL. No-op when unset. Never throws.
 */
export async function sendFeedbackToDiscord(data: DiscordFeedback) {
  const webhookUrl = process.env.DISCORD_FEEDBACK_WEBHOOK_URL
  if (!webhookUrl) return

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildDiscordFeedbackPayload(data)),
      signal: controller.signal
    })
    if (!res.ok) {
      console.error(
        'Discord feedback webhook failed:',
        res.status,
        await res.text().catch(() => '')
      )
    }
  } catch (error) {
    console.error('Failed to send Discord notification:', error)
  } finally {
    clearTimeout(timeout)
  }
}
