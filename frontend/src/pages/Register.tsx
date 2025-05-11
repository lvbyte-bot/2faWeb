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
  
  const form = useForm<RegisterFormValues>({
    initialValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validate: {
      username: (value) => (value.length < 3 ? '用户名至少需要3个字符' : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : '请输入有效的电子邮件地址'),
      password: (value) => (value.length < 8 ? '密码至少需要8个字符' : null),
      confirmPassword: (value, values) => 
        value !== values.password ? '密码不匹配' : null,
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
          创建新账户
        </Title>
        
        <Text c="dimmed" size="sm" ta="center" mb="xl">
          注册2FA Web以管理您的二步验证
        </Text>
        
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            label="用户名"
            placeholder="您的用户名"
            required
            {...form.getInputProps('username')}
          />
          
          <TextInput
            label="电子邮件"
            placeholder="您的电子邮件"
            required
            mt="md"
            {...form.getInputProps('email')}
          />
          
          <PasswordInput
            label="密码"
            placeholder="您的密码"
            required
            mt="md"
            {...form.getInputProps('password')}
          />
          
          <PasswordInput
            label="确认密码"
            placeholder="确认您的密码"
            required
            mt="md"
            {...form.getInputProps('confirmPassword')}
          />
          
          <Group justify="space-between" mt="lg">
            <Anchor component={Link} to="/login" size="sm">
              已有账户？登录
            </Anchor>
          </Group>
          
          <Button fullWidth mt="xl" type="submit" loading={loading}>
            注册
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
