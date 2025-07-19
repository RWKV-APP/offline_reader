import { Base } from './Base';
import { useState } from 'react';
import { FaBug } from 'react-icons/fa';
import type { FC } from 'react';

export const FeedbackButton: FC<{
  style?: React.CSSProperties;
}> = ({ style }) => {
  const [showDialog, setShowDialog] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim()) return;

    setIsSubmitting(true);
    try {
      const currentUrl = window.location.href;
      const subject = encodeURIComponent('离线阅读器问题反馈');
      const body = encodeURIComponent(`页面URL: ${currentUrl}\n\n问题描述:\n${feedback}`);
      const mailtoUrl = `mailto:wangce@rwkvos.com?subject=${subject}&body=${body}`;

      window.open(mailtoUrl, '_blank');
      setShowDialog(false);
      setFeedback('');
    } catch (error) {
      console.error('发送反馈失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setShowDialog(false);
    setFeedback('');
  };

  return (
    <>
      <Base icon={<FaBug />} title="问题反馈" value="报告问题" onClick={() => setShowDialog(true)} style={style} />

      {showDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2147483648,
            pointerEvents: 'auto',
          }}
          role="dialog"
          aria-modal="true">
          <button
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              zIndex: -1,
            }}
            onClick={handleCancel}
            aria-label="关闭对话框"
          />
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative',
              zIndex: 1,
            }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: '#111827' }}>问题反馈</h3>

            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="feedback-textarea"
                style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#374151' }}>
                请描述您遇到的问题:
              </label>
              <textarea
                id="feedback-textarea"
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="请详细描述您遇到的问题..."
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancel}
                disabled={isSubmitting}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  color: '#374151',
                  cursor: 'pointer',
                  fontSize: '14px',
                  outline: 'none',
                  opacity: isSubmitting ? 0.5 : 1,
                }}
                onMouseEnter={e => {
                  if (!isSubmitting) {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }
                }}
                onMouseLeave={e => {
                  if (!isSubmitting) {
                    e.currentTarget.style.backgroundColor = 'white';
                  }
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}>
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!feedback.trim() || isSubmitting}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: feedback.trim() && !isSubmitting ? '#2563eb' : '#9ca3af',
                  color: 'white',
                  cursor: feedback.trim() && !isSubmitting ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  outline: 'none',
                }}
                onMouseEnter={e => {
                  if (feedback.trim() && !isSubmitting) {
                    e.currentTarget.style.backgroundColor = '#1d4ed8';
                  }
                }}
                onMouseLeave={e => {
                  if (feedback.trim() && !isSubmitting) {
                    e.currentTarget.style.backgroundColor = '#2563eb';
                  }
                }}
                onFocus={e => {
                  if (feedback.trim() && !isSubmitting) {
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }
                }}
                onBlur={e => {
                  e.currentTarget.style.boxShadow = 'none';
                }}>
                {isSubmitting ? '发送中...' : '发送反馈'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
