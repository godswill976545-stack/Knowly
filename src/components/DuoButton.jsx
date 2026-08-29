export function DuoButton({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) {
  const sizeMap = {
    sm: 'px-4 py-2 text-[13px]',
    md: 'px-5 py-2.5 text-[14px]',
    lg: 'px-6 py-3 text-[15px]',
    xl: 'px-7 py-3.5 text-[15px]',
  }
  const variantClass = `btn-duo--${variant}`
  return (
    <button
      className={`btn-duo ${variantClass} ${sizeMap[size] || sizeMap.md} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function DuoLink({ variant = 'primary', size = 'md', className = '', children, ...props }) {
  const sizeMap = {
    sm: 'px-4 py-2 text-[13px]',
    md: 'px-5 py-2.5 text-[14px]',
    lg: 'px-6 py-3 text-[15px]',
    xl: 'px-7 py-3.5 text-[15px]',
  }
  return (
    <a className={`btn-duo btn-duo--${variant} ${sizeMap[size] || sizeMap.md} ${className}`} {...props}>
      {children}
    </a>
  )
}
