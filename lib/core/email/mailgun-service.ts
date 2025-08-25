const MAILGUN_BASE_URL = 'https://api.mailgun.net/v3';

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  from?: string;
  attachments?: Array<{
    filename: string;
    data: Buffer;
    contentType?: string;
  }>;
}

export async function sendEmail(data: EmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
      throw new Error('Mailgun configuration missing. Please set MAILGUN_API_KEY and MAILGUN_DOMAIN environment variables.');
    }

    const formData = new FormData();
    formData.append('from', data.from || process.env.MAILGUN_FROM_EMAIL || 'noreply@yourdomain.com');
    formData.append('to', data.to);
    formData.append('subject', data.subject);
    formData.append('html', data.html);

    // Add attachments if provided
    if (data.attachments && data.attachments.length > 0) {
      data.attachments.forEach((attachment) => {
        const blob = new Blob([new Uint8Array(attachment.data)], { type: attachment.contentType || 'application/octet-stream' });
        formData.append(`attachment`, blob, attachment.filename);
      });
    }

    const response = await fetch(`${MAILGUN_BASE_URL}/${process.env.MAILGUN_DOMAIN}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString('base64')}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Mailgun API error: ${response.status} ${errorData}`);
    }

    const result = await response.json();

    return {
      success: true,
      messageId: result.id,
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred while sending email',
    };
  }
}

export function validateEmailConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!process.env.MAILGUN_API_KEY) {
    errors.push('MAILGUN_API_KEY environment variable is required');
  }

  if (!process.env.MAILGUN_DOMAIN) {
    errors.push('MAILGUN_DOMAIN environment variable is required');
  }

  if (!process.env.MAILGUN_FROM_EMAIL) {
    errors.push('MAILGUN_FROM_EMAIL environment variable is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}