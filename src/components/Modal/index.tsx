import { useCallback, useEffect, useRef } from 'react'

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
  const dialogRef = useRef<null | HTMLDialogElement>(null)

  const handleClose = useCallback(() => {
    const dialog = dialogRef.current
    if (dialog) {
      dialog.close()
    }
  }, [dialogRef])

  const CloseButton = () => {
    return (
      <>
        {closeButton === true && (
          <button
            onClick={(event) => {
              event.preventDefault()
              handleClose()
            }}
          >
            Close
          </button>
        )}
        {closeButton}
      </>
    )
  }

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog) {
      const openListener = () => (onOpen ? onOpen() : null)
      dialog.addEventListener('open', openListener)

      const closeListener = () => (onClose ? onClose() : null)
      dialog.addEventListener('close', closeListener)

      return () => {
        dialog.removeEventListener('open', openListener)
        dialog.removeEventListener('close', closeListener)
      }
    }
  }, [dialogRef, onOpen, onClose])

  return (
    <dialog ref={dialogRef} open={open} className='iight-modal'>
      {header && (
        <div className='iight-modal__header'>
          {header}
          <CloseButton />
        </div>
      )}

      {!header && <CloseButton />}

      <div>{children}</div>

      {footer && <div className='iight-modal__footer'>{footer}</div>}
    </dialog>
  )
}
