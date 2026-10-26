import {
  educationInputSchema,
  experienceInputSchema,
  type EducationDto,
  type EducationInput,
  type ExperienceDto,
  type ExperienceInput,
  type ProfileDetail,
} from '@devconnector/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ActionIcon,
  Button,
  Card,
  Checkbox,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import {
  type FieldErrors,
  type Path,
  useForm,
  type UseFormRegister,
  type UseFormWatch,
} from 'react-hook-form';
import { applyServerErrors, FormError } from '@/components/FormError.tsx';
import { EmptyState } from '@/components/States.tsx';
import { useCvMutations } from '@/features/profiles/api.ts';
import { period } from '@/features/profiles/DeveloperPage.tsx';
import { toast } from '@/lib/notify.ts';

interface Period {
  startedOn: string;
  endedOn: string | null;
  isCurrent: boolean;
}

function PeriodFields<T extends Period>({
  register,
  watch,
  errors,
}: {
  register: UseFormRegister<T>;
  watch: UseFormWatch<T>;
  errors: FieldErrors<T>;
}) {
  const current = watch('isCurrent' as Path<T>) as unknown as boolean;
  return (
    <>
      <SimpleGrid cols={2}>
        <TextInput
          type="date"
          label="From"
          error={errors.startedOn?.message as string | undefined}
          {...register('startedOn' as Path<T>)}
        />
        <TextInput
          type="date"
          label="To"
          disabled={current}
          error={errors.endedOn?.message as string | undefined}
          {...register('endedOn' as Path<T>, { setValueAs: (v: string) => (v === '' ? null : v) })}
        />
      </SimpleGrid>
      <Checkbox label="Current position?" {...register('isCurrent' as Path<T>)} />
    </>
  );
}

const EMPTY_EXPERIENCE: ExperienceInput = {
  title: '',
  description: '',
  company: '',
  location: '',
  startedOn: '',
  endedOn: null,
  isCurrent: false,
};
const EMPTY_EDUCATION: EducationInput = {
  school: '',
  description: '',
  degree: '',
  fieldOfStudy: '',
  startedOn: '',
  endedOn: null,
  isCurrent: false,
};

function ExperienceModal({
  initial,
  onClose,
}: {
  initial: ExperienceDto | null;
  onClose: () => void;
}) {
  const { addExperience, updateExperience } = useCvMutations();
  const [general, setGeneral] = useState<string | null>(null);
  const {
    register,
    watch,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ExperienceInput>({
    resolver: zodResolver(experienceInputSchema),
    defaultValues: initial ? { ...initial } : EMPTY_EXPERIENCE,
  });
  const fields: Path<ExperienceInput>[] = [
    'title',
    'description',
    'company',
    'location',
    'startedOn',
    'endedOn',
    'isCurrent',
  ];
  return (
    <form
      onSubmit={handleSubmit((values) => {
        const done = () => {
          toast.success(initial ? 'Experience updated' : 'experience has been added');
          onClose();
        };
        const fail = (e: unknown) => {
          setGeneral(applyServerErrors(e, setError, fields));
        };
        if (initial)
          updateExperience.mutate(
            { id: initial.id, input: values },
            { onSuccess: done, onError: fail },
          );
        else addExperience.mutate(values, { onSuccess: done, onError: fail });
      })}
      noValidate
    >
      <Stack>
        <TextInput label="Title" error={errors.title?.message} {...register('title')} />
        <Textarea
          label="Description"
          autosize
          minRows={2}
          error={errors.description?.message}
          {...register('description')}
        />
        <TextInput label="Company" error={errors.company?.message} {...register('company')} />
        <TextInput label="Location" error={errors.location?.message} {...register('location')} />
        <PeriodFields register={register} watch={watch} errors={errors} />
        <FormError message={general} />
        <Group justify="flex-end">
          <Button
            type="submit"
            loading={isSubmitting || addExperience.isPending || updateExperience.isPending}
          >
            Save
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

function EducationModal({
  initial,
  onClose,
}: {
  initial: EducationDto | null;
  onClose: () => void;
}) {
  const { addEducation, updateEducation } = useCvMutations();
  const [general, setGeneral] = useState<string | null>(null);
  const {
    register,
    watch,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EducationInput>({
    resolver: zodResolver(educationInputSchema),
    defaultValues: initial ? { ...initial } : EMPTY_EDUCATION,
  });
  const fields: Path<EducationInput>[] = [
    'school',
    'description',
    'degree',
    'fieldOfStudy',
    'startedOn',
    'endedOn',
    'isCurrent',
  ];
  return (
    <form
      onSubmit={handleSubmit((values) => {
        const done = () => {
          toast.success(initial ? 'Education updated' : 'education has been added');
          onClose();
        };
        const fail = (e: unknown) => {
          setGeneral(applyServerErrors(e, setError, fields));
        };
        if (initial)
          updateEducation.mutate(
            { id: initial.id, input: values },
            { onSuccess: done, onError: fail },
          );
        else addEducation.mutate(values, { onSuccess: done, onError: fail });
      })}
      noValidate
    >
      <Stack>
        <TextInput label="School" error={errors.school?.message} {...register('school')} />
        <Textarea
          label="Description"
          autosize
          minRows={2}
          error={errors.description?.message}
          {...register('description')}
        />
        <TextInput label="Degree" error={errors.degree?.message} {...register('degree')} />
        <TextInput
          label="Field of study"
          error={errors.fieldOfStudy?.message}
          {...register('fieldOfStudy')}
        />
        <PeriodFields register={register} watch={watch} errors={errors} />
        <FormError message={general} />
        <Group justify="flex-end">
          <Button
            type="submit"
            loading={isSubmitting || addEducation.isPending || updateEducation.isPending}
          >
            Save
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <Group gap={4} wrap="nowrap" justify="flex-end">
      <ActionIcon variant="subtle" aria-label="Edit" onClick={onEdit}>
        <IconPencil size={16} />
      </ActionIcon>
      <ActionIcon variant="subtle" color="red" aria-label="Delete" onClick={onDelete}>
        <IconTrash size={16} />
      </ActionIcon>
    </Group>
  );
}

export function CvSections({ profile }: { profile: ProfileDetail }) {
  const { removeExperience, removeEducation } = useCvMutations();
  const [expOpened, exp] = useDisclosure(false);
  const [eduOpened, edu] = useDisclosure(false);
  const [editingExp, setEditingExp] = useState<ExperienceDto | null>(null);
  const [editingEdu, setEditingEdu] = useState<EducationDto | null>(null);

  const confirm = (what: string, run: () => void) =>
    modals.openConfirmModal({
      title: `Delete ${what}`,
      children: <Text size="sm">Are you sure? You can't undo this action afterwards.</Text>,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: run,
    });

  return (
    <>
      <Card mt="md">
        <Group justify="space-between" mb="sm">
          <Text fw={600}>Experiences</Text>
          <Button
            size="xs"
            leftSection={<IconPlus size={14} />}
            onClick={() => {
              setEditingExp(null);
              exp.open();
            }}
          >
            Add
          </Button>
        </Group>
        {profile.experiences.length === 0 ? (
          <EmptyState message="Experiences will show up here!" />
        ) : (
          <Table.ScrollContainer minWidth={700}>
            <Table striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Title</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Company</Table.Th>
                  <Table.Th>Location</Table.Th>
                  <Table.Th>From – To</Table.Th>
                  <Table.Th>Current</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {profile.experiences.map((e) => (
                  <Table.Tr key={e.id}>
                    <Table.Td fw={500}>{e.title}</Table.Td>
                    <Table.Td>{e.description}</Table.Td>
                    <Table.Td>{e.company}</Table.Td>
                    <Table.Td>{e.location}</Table.Td>
                    <Table.Td>{period(e)}</Table.Td>
                    <Table.Td>{e.isCurrent ? 'Yes' : 'No'}</Table.Td>
                    <Table.Td>
                      <RowActions
                        onEdit={() => {
                          setEditingExp(e);
                          exp.open();
                        }}
                        onDelete={() =>
                          confirm('experience', () => {
                            removeExperience.mutate(e.id, {
                              onSuccess: () => {
                                toast.success('Experience removed');
                              },
                              onError: (err) => {
                                toast.error(err);
                              },
                            });
                          })
                        }
                      />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>
      <Card mt="md">
        <Group justify="space-between" mb="sm">
          <Text fw={600}>Education</Text>
          <Button
            size="xs"
            leftSection={<IconPlus size={14} />}
            onClick={() => {
              setEditingEdu(null);
              edu.open();
            }}
          >
            Add
          </Button>
        </Group>
        {profile.educations.length === 0 ? (
          <EmptyState message="Education will show up here!" />
        ) : (
          <Table.ScrollContainer minWidth={700}>
            <Table striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>School</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Degree</Table.Th>
                  <Table.Th>Field of study</Table.Th>
                  <Table.Th>From – To</Table.Th>
                  <Table.Th>Current</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {profile.educations.map((e) => (
                  <Table.Tr key={e.id}>
                    <Table.Td fw={500}>{e.school}</Table.Td>
                    <Table.Td>{e.description}</Table.Td>
                    <Table.Td>{e.degree}</Table.Td>
                    <Table.Td>{e.fieldOfStudy}</Table.Td>
                    <Table.Td>{period(e)}</Table.Td>
                    <Table.Td>{e.isCurrent ? 'Yes' : 'No'}</Table.Td>
                    <Table.Td>
                      <RowActions
                        onEdit={() => {
                          setEditingEdu(e);
                          edu.open();
                        }}
                        onDelete={() =>
                          confirm('education', () => {
                            removeEducation.mutate(e.id, {
                              onSuccess: () => {
                                toast.success('Education removed');
                              },
                              onError: (err) => {
                                toast.error(err);
                              },
                            });
                          })
                        }
                      />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>
      <Modal
        opened={expOpened}
        onClose={exp.close}
        title={editingExp ? 'Edit Experience' : 'Add Experience'}
        centered
      >
        {expOpened && <ExperienceModal initial={editingExp} onClose={exp.close} />}
      </Modal>
      <Modal
        opened={eduOpened}
        onClose={edu.close}
        title={editingEdu ? 'Edit Education' : 'Add Education'}
        centered
      >
        {eduOpened && <EducationModal initial={editingEdu} onClose={edu.close} />}
      </Modal>
    </>
  );
}
