import sgMail from '@sendgrid/mail';

// SendGrid API設定
console.log('SendGrid initialization - API Key present:', !!process.env.SENDGRID_API_KEY);
console.log('SendGrid initialization - From Email:', process.env.SENDGRID_FROM_EMAIL);

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('SendGrid API key set successfully');
} else {
  console.error('SENDGRID_API_KEY environment variable is not set!');
} 

// 招待メールの送信
export async function sendInvitationEmail(
  recipientEmail: string,
  teamName: string,
  invitationLink: string,
) {
  try {
    console.log('Sending invitation email to:', recipientEmail);
    console.log('Environment variables check:', {
      SENDGRID_API_KEY: !!process.env.SENDGRID_API_KEY,
      SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL,
      APP_NAME: process.env.APP_NAME
    });
    
    const senderEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com';
    const appName = process.env.APP_NAME || 'Smuuze';
    
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${teamName}に招待されました</h2>
        <p>${teamName}のメンバーとして招待されました。</p>
        <p>以下のリンクをクリックして招待を承認してください：</p>
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

    console.log('Attempting to send email with message:', {
      to: msg.to,
      from: msg.from,
      subject: msg.subject
    });
    
    const result = await sgMail.send(msg);
    console.log('Email sent successfully: %s', result[0].statusCode);
    return { success: true, messageId: result[0].headers['x-message-id'] };
  } catch (error) {
    console.error('Error sending email:', error);
    
    // エラーの詳細ログ
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    // SendGridのエラーレスポンスを詳しくログ
    if ((error as any).response) {
      console.error('SendGrid response status:', (error as any).response.status);
      console.error('SendGrid response headers:', (error as any).response.headers);
      console.error('SendGrid response body:', (error as any).response.body);
    }
    
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