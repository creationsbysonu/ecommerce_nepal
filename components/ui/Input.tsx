import styles from './ui.module.css';
import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, id, ...props }, ref) => {
    const inputId = id || props.name;
    
    return (
      <div className={styles.inputWrapper}>
        {label && <label htmlFor={inputId} className={styles.label}>{label}</label>}
        <input 
          id={inputId}
          ref={ref} 
          className={`${styles.input} ${error ? styles.inputError : ''} ${className}`} 
          {...props} 
        />
        {error && <span className={styles.errorMessage}>{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
