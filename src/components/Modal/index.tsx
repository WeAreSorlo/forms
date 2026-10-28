import { useCallback, useEffect, useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'

export interface ModalProps {
  open: React.HTMLProps<HTMLDialogElement>['open']
  header?: React.ReactNode
  footer?: React.ReactNode
  closeButton?: boolean | React.ReactNode
  children: React.ReactNode
  onClose?: () => void
  onOpen?: () => void
}

export default function Modal({ open, header, footer, closeButton, onOpen, onClose, children }: ModalProps) {
  const { t } = useTranslation()
  const headerId = useId()
  const dialogRef = useRef<null | HTMLDialogElement>(null)

  const handleClose = useCallback(() => {
    const dialog = dialogRef.current
    if (dialog) {
      dialog.close()
    }
  }, [dialogRef])

  // An element, not a component made here, which React would rebuild on every render, losing a focused button
  const close =
    closeButton === true ? (
      <button
        className='iight-button'
        type='button'
        onClick={(event) => {
          event.preventDefault()
          handleClose()
        }}
      >
        {t('ui.close')}
      </button>
    ) : (
      closeButton
    )

  // Open dialog with JS api gives us the ::backdrop psuedo element
  // @link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog#open
  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog) {
      if (open && !dialog.open) {
        dialog.showModal()
        if (onOpen) onOpen()
      } else if (!open && dialog.open) {
        dialog.close()
      }
    }
  }, [dialogRef, open, onOpen])

  // Fire the close event when the dialog is dismissed natively, e.g. with the escape key
  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog) {
      const closeListener = () => (onClose ? onClose() : null)
      dialog.addEventListener('close', closeListener)

      return () => {
        dialog.removeEventListener('close', closeListener)
      }
    }
  }, [dialogRef, onClose])

  return (
    <dialog ref={dialogRef} className='iight-modal' aria-labelledby={header ? headerId : undefined}>
      {header && (
        <div className='iight-modal__header' id={headerId}>
          {header}
          {close}
        </div>
      )}

      {!header && close}

      <div className='iight-modal__body'>{children}</div>

      {footer && <div className='iight-modal__footer'>{footer}</div>}
    </dialog>
  )
}
