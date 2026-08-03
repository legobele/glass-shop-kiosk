export default function Button({
  variant = 'primary',
  block,
  loading,
  children,
  ...props
}) {
  const cls = ['btn'];
  if (variant === 'primary') cls.push('btn-primary');
  if (variant === 'success') cls.push('btn-success');
  if (variant === 'ghost') cls.push('btn-ghost');
  if (variant === 'danger') cls.push('btn-danger');
  if (block) cls.push('btn-block');
  return (
    <button className={cls.join(' ')} disabled={props.disabled || loading} {...props}>
      {loading ? <span className="spinner" /> : null}
      {children}
    </button>
  );
}
