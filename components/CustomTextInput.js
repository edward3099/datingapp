import React, { useRef, useEffect } from 'react'
import { TextInput, Platform } from 'react-native'

/**
 * Custom TextInput component that attempts to disable iOS predictive text bar
 * This is a workaround for the yellow box issue on iOS
 */
const CustomTextInput = React.forwardRef((props, ref) => {
  const internalRef = useRef(null)
  const inputRef = ref || internalRef

  useEffect(() => {
    if (Platform.OS === 'ios' && inputRef.current) {
      // Force disable autocorrect on mount
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.setNativeProps({
            textContentType: '',
            autoCorrect: false,
            autocorrectionType: 0,
          })
        }
      }, 100)
    }
  }, [])

  const handleFocus = (e) => {
    if (Platform.OS === 'ios' && inputRef.current) {
      // Force disable autocorrect on focus
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.setNativeProps({
            textContentType: '',
            autoCorrect: false,
            autocorrectionType: 0,
          })
        }
      }, 10)
    }
    if (props.onFocus) {
      props.onFocus(e)
    }
  }

  return (
    <TextInput
      {...props}
      ref={inputRef}
      onFocus={handleFocus}
      autoCorrect={false}
      spellCheck={false}
      textContentType={props.textContentType || ''}
      importantForAutofill="no"
      contextMenuHidden={true}
      {...(Platform.OS === 'ios' && {
        clearButtonMode: 'never',
        inputAccessoryViewID: undefined,
      })}
    />
  )
})

CustomTextInput.displayName = 'CustomTextInput'

export default CustomTextInput


