import {
  Box,
  Portal,
  Spinner,
  Stack,
  Toast,
  Toaster,
} from "@chakra-ui/react";
import { toaster } from "../../utils/toaster";

export function AppToaster() {
  return (
    <Portal>
      <Toaster toaster={toaster} insetInline={{ base: "3", md: "4" }}>
        {(toast) => (
          <Toast.Root width={{ base: "calc(100vw - 1.5rem)", md: "sm" }}>
            {toast.type === "loading" ? (
              <Spinner size="sm" color="currentColor" />
            ) : (
              <Toast.Indicator />
            )}
            <Stack gap="1" flex="1" maxW="100%">
              {toast.title && <Toast.Title>{toast.title}</Toast.Title>}
              {toast.description && (
                <Toast.Description>{toast.description}</Toast.Description>
              )}
            </Stack>
            <Box>
              <Toast.CloseTrigger />
            </Box>
          </Toast.Root>
        )}
      </Toaster>
    </Portal>
  );
}
