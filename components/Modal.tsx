import { useEffect } from 'react';
import styles from './Modal.module.css';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    hideClose?: boolean;
    closeOnOutsideClick?: boolean;
    className?: string;
    onClick?: () => void;
    footer?: React.ReactNode;
}

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    hideClose,
    closeOnOutsideClick = true,
    className = '',
    onClick,
    footer
}: ModalProps) {
    // Body scroll lock
    useEffect(() => {
        if (isOpen) {
            document.body.classList.add(styles.noScroll);
        } else {
            document.body.classList.remove(styles.noScroll);
        }
        return () => document.body.classList.remove(styles.noScroll);
    }, [isOpen]);

    // Close on Escape key
    useEffect(() => {
        if (!isOpen || hideClose) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose, hideClose]);

    if (!isOpen) return null;

    const handleOverlayClick = () => {
        handleOnClick();
        if (closeOnOutsideClick) {
            onClose();
        }
    };

    const handleOnClick = () => {
        if (onClick) {
            onClick();
        }
    }

    return (
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div className={`${styles.modal} ${className}`} onClick={(e) => { e.stopPropagation(); handleOnClick(); }}>
                <div className={styles.header}>
                    <h2 className={styles.title}>{title}</h2>
                    <button onClick={onClose} className={styles.closeBtn}>&times;</button>
                </div>
                {children}
            </div>
            {footer && (
                <div className={styles.externalFooter} onClick={(e) => e.stopPropagation()}>
                    {footer}
                </div>
            )}
        </div>
    );
}
