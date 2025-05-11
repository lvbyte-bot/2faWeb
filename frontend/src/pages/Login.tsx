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

interface LoginFormValues {
  username: string;
  password: string;
}

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const form = useForm<LoginFormValues>({
    initialValues: {
      username: '',
      password: '',
    },
    validate: {
      username: (value) => (value.length < 3 ? '用户名至少需要3个字符' : null),
      password: (value) => (value.length < 8 ? '密码至少需要8个字符' : null),
    },
  });
  
  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    
    try {
      const success = await login(values.username, values.password);
      
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
          欢迎使用2FA Web
        </Title>
        
        <Text c="dimmed" size="sm" ta="center" mb="xl">
          登录您的账户以管理二步验证
        </Text>
        
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            label="用户名"
            placeholder="您的用户名"
            required
            {...form.getInputProps('username')}
          />
          
          <PasswordInput
            label="密码"
            placeholder="您的密码"
            required
            mt="md"
            {...form.getInputProps('password')}
          />
          
          <Group justify="space-between" mt="lg">
            <Anchor component={Link} to="/register" size="sm">
              没有账户？注册
            </Anchor>
          </Group>
          
          <Button fullWidth mt="xl" type="submit" loading={loading}>
            登录
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
