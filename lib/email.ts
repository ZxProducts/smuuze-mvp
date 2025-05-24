import sgMail from '@sendgrid/mail';

// SendGrid API設定
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// 招待メールの送信
export async function sendInvitationEmail(
  recipientEmail: string,
  teamName: string,
  invitationLink: string,
) {
  try {
    const senderEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com';
    const appName = process.env.APP_NAME || 'Smuuze';
    
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${teamName}に招待されました</h2>
        <p>${teamName}のメンバーとして招待されました。</p>
        <p>以下のリンクをクリックして招待を承認してください：</p>
        <p style="margin: 20px 0;">
          <a href="${invitationLink}" style="background-color: #4f46e5; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">
            招待を承認する
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">ボタンが機能しない場合は、以下のURLをコピーしてブラウザに貼り付けてください：</p>
        <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px; border: 1px solid #e0e0e0; font-family: monospace; font-size: 12px; margin-bottom: 15px;">
          ${invitationLink}
        </p>
        <p style="color: #666; font-size: 14px;">このリンクは1回のみ有効です。セキュリティのため他の人には共有しないでください。</p>
      </div>
    `;

    const msg = {
      to: recipientEmail,
      from: {
        email: senderEmail,
        name: appName
      },
      subject: `【${appName}】${teamName}に招待されました`,
      html: html,
    };

    const result = await sgMail.send(msg);
    console.log('Email sent: %s', result[0].statusCode);
    return { success: true, messageId: result[0].headers['x-message-id'] };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}

// 環境変数チェック（初期起動時に問題があれば検知するため）
(() => {
  const requiredEnvVars = ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL'];
  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingEnvVars.length > 0) {
    console.warn(`警告: 以下の環境変数が設定されていません: ${missingEnvVars.join(', ')}`);
  }
})(); 