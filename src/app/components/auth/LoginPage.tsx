import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface LoginFormData {
  email: string;
  password: string;
}

interface SignupFormData extends LoginFormData {
  name: string;
  confirmPassword: string;
}

export function LoginPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signin, signup } = useAuth();

  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm<SignupFormData>({
    mode: 'onSubmit', // Solo validar al enviar
    reValidateMode: 'onChange',
  });

  const password = watch('password');

  const onSubmit = async (data: SignupFormData) => {
    try {
      if (isSignup) {
        await signup(data.email, data.password, data.name);
        toast.success('¡Cuenta creada exitosamente!');
      } else {
        await signin(data.email, data.password);
        toast.success('¡Sesión iniciada!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al procesar la solicitud');
    }
  };

  const toggleMode = () => {
    setIsSignup(!isSignup);
    reset();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">
            {isSignup ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </CardTitle>
          <CardDescription>
            {isSignup
              ? 'Crea una cuenta para acceder al sistema'
              : 'Ingresa tus credenciales para continuar'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <Input
                  id="name"
                  placeholder="Juan Pérez"
                  {...register('name', {
                    required: isSignup ? 'El nombre es requerido' : false,
                  })}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@ejemplo.com"
                {...register('email', {
                  required: 'El correo es requerido',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Correo inválido',
                  },
                })}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password', {
                    required: 'La contraseña es requerida',
                    minLength: {
                      value: 6,
                      message: 'Mínimo 6 caracteres',
                    },
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('confirmPassword', {
                    required: isSignup ? 'Confirma tu contraseña' : false,
                    validate: (value) =>
                      !isSignup || value === password || 'Las contraseñas no coinciden',
                  })}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
                )}
              </div>
            )}

            <Button type="submit" className="w-full">
              {isSignup ? 'Crear Cuenta' : 'Ingresar'}
            </Button>

            <div className="text-center text-sm">
              <button
                type="button"
                onClick={toggleMode}
                className="text-blue-600 hover:underline"
              >
                {isSignup
                  ? '¿Ya tienes cuenta? Inicia sesión'
                  : '¿No tienes cuenta? Regístrate'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}