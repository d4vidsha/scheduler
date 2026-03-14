import {
  Box,
  Container,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Select,
  Text,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ApiError } from "../../client"
import { UsersService } from "../../client"
import useCustomToast from "../../hooks/useCustomToast"
import { handleError } from "../../utils"

function formatHour(hour: number): string {
  if (hour === 0) return "12:00 AM"
  if (hour < 12) return `${hour}:00 AM`
  if (hour === 12) return "12:00 PM"
  return `${hour - 12}:00 PM`
}

const WorkingHours = () => {
  const queryClient = useQueryClient()
  const showToast = useCustomToast()

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => UsersService.readUserMe(),
  })

  const workStart = user?.work_start ?? 9
  const workEnd = user?.work_end ?? 18

  const mutation = useMutation({
    mutationFn: (data: { work_start: number; work_end: number }) =>
      UsersService.updateUserMe({ requestBody: data }),
    onSuccess: () => {
      showToast("Success!", "Working hours updated successfully.", "success")
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
    },
    onError: (err: ApiError) => {
      handleError(err, showToast)
    },
  })

  const handleStartChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStart = Number(e.target.value)
    mutation.mutate({ work_start: newStart, work_end: workEnd })
  }

  const handleEndChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newEnd = Number(e.target.value)
    mutation.mutate({ work_start: workStart, work_end: newEnd })
  }

  return (
    <Container maxW="full">
      <Heading size="sm" py={4}>
        Working Hours
      </Heading>
      <Text fontSize="sm" color="gray.500" mb={4}>
        Tasks will be scheduled within these hours.
      </Text>
      <Box w={{ sm: "full", md: "50%" }}>
        <Flex gap={4} direction={{ base: "column", sm: "row" }}>
          <FormControl>
            <FormLabel htmlFor="work-start">Work start</FormLabel>
            <Select
              id="work-start"
              value={workStart}
              onChange={handleStartChange}
              isDisabled={mutation.status === "pending"}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {formatHour(i)}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel htmlFor="work-end">Work end</FormLabel>
            <Select
              id="work-end"
              value={workEnd}
              onChange={handleEndChange}
              isDisabled={mutation.status === "pending"}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {formatHour(i)}
                </option>
              ))}
            </Select>
          </FormControl>
        </Flex>
        {mutation.status === "pending" && (
          <Text fontSize="xs" color="gray.400" mt={2}>
            Saving...
          </Text>
        )}
      </Box>
    </Container>
  )
}

export default WorkingHours
