export function DuoButton({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  type = 'button',
  ...props
}) {
  const sizeMap = {
    sm: 'px-4 py-2.5 text-[14px] min-h-[44px]',
    md: 'px-5 py-3 text-[15px] min-h-[48px]',
    lg: 'px-6 py-3.5 text-[16px] min-h-[52px]',
    xl: 'px-7 py-4 text-[16px] min-h-[56px]',
  }
  const variantClass = `btn-duo--${variant}`
  return (
    <button
      type={type}
      className={`btn-duo ${variantClass} ${sizeMap[size] || sizeMap.md} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function DuoLink({ variant = 'primary', size = 'md', className = '', children, ...props }) {
  const sizeMap = {
    sm: 'px-4 py-2.5 text-[14px] min-h-[44px]',
    md: 'px-5 py-3 text-[15px] min-h-[48px]',
    lg: 'px-6 py-3.5 text-[16px] min-h-[52px]',
    xl: 'px-7 py-4 text-[16px] min-h-[56px]',
  }
  return (
    <a className={`btn-duo btn-duo--${variant} ${sizeMap[size] || sizeMap.md} ${className}`} {...props}>
      {children}
    </a>
  )
}
