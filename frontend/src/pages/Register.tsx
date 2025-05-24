import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  TextInput, 
  PasswordInput, 
  Button, 
  Group, 
  Box, 
  Title, 
  Text, 
  Container, 
  Paper,
  Anchor
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

interface RegisterFormValues {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function Register() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();
  const { t } = useTranslation();
  
  const form = useForm<RegisterFormValues>({
    initialValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validate: {
      username: (value) => (value.length < 3 ? t('auth.usernameMinLength') : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : t('auth.invalidEmail')),
      password: (value) => (value.length < 8 ? t('auth.passwordMinLength') : null),
      confirmPassword: (value, values) => 
        value !== values.password ? t('auth.passwordMismatch') : null,
    },
  });
  
  const handleSubmit = async (values: RegisterFormValues) => {
    setLoading(true);
    
    try {
      const success = await register(values.username, values.email, values.password);
      
      if (success) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Container size="xs" py="xl">
      <Paper radius="md" p="xl" withBorder>
        <Title order={2} ta="center" mt="md" mb="md">
          {t('auth.createAccount')}
        </Title>
        
        <Text c="dimmed" size="sm" ta="center" mb="xl">
          {t('auth.registerDescription')}
        </Text>
        
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            label={t('auth.username')}
            placeholder={t('auth.usernamePlaceholder')}
            required
            {...form.getInputProps('username')}
          />
          
          <TextInput
            label={t('auth.email')}
            placeholder={t('auth.emailPlaceholder')}
            required
            mt="md"
            {...form.getInputProps('email')}
          />
          
          <PasswordInput
            label={t('auth.password')}
            placeholder={t('auth.passwordPlaceholder')}
            required
            mt="md"
            {...form.getInputProps('password')}
          />
          
          <PasswordInput
            label={t('auth.confirmPassword')}
            placeholder={t('auth.confirmPasswordPlaceholder')}
            required
            mt="md"
            {...form.getInputProps('confirmPassword')}
          />
          
          <Group justify="space-between" mt="lg">
            <Anchor component={Link} to="/login" size="sm">
              {t('auth.haveAccountLogin')}
            </Anchor>
          </Group>
          
          <Button fullWidth mt="xl" type="submit" loading={loading}>
            {t('auth.register')}
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
