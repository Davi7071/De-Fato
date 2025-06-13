import React, { useState } from 'react';
import {
  View,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  Text,
  ActivityIndicator,
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../services/firebaseConfig'; // Certifique-se que este caminho está correto
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const router = useRouter();

  const logar = async () => {
    if (!email || !senha) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }

    setCarregando(true);

    try {
      // 1. Login no Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, senha);
      const user = userCredential.user;

      // 2. Obter dados do Firestore
      //    Usando 'usuario' como nome da coleção, conforme nossas discussões anteriores.
      //    Se for diferente, ajuste aqui.
      const userDocRef = doc(db, 'usuario', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        Alert.alert('Erro', 'Dados do usuário não encontrados no Firestore.');
        // await auth.signOut(); // Opcional: deslogar se dados do Firestore não existem
        setCarregando(false);
        return;
      }

      const userData = userDoc.data();

      // 3. Verificar se o cadastro foi aprovado
      //    Ajuste 'aprovado' se o valor no seu banco para status aprovado for diferente.
      if (userData.status !== 'aprovado') {
        Alert.alert('Acesso negado', `Seu cadastro está com status: ${userData.status || 'em análise'}.`);
        // await auth.signOut(); // Opcional: deslogar se não aprovado
        setCarregando(false);
        return;
      }

      // 4. Redirecionar para a página inicial (index) após login e aprovação.
      console.log('Login bem-sucedido e usuário aprovado. Redirecionando para a página inicial (index)...');
      router.replace('/'); // Redireciona para app/index.jsx


    } catch (error) {
      let mensagem = 'Erro ao fazer login. Tente novamente.';
      switch (error.code) {
        case 'auth/invalid-email':
          mensagem = 'Email inválido.';
          break;
        case 'auth/user-disabled':
          mensagem = 'Este usuário foi desativado.';
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          mensagem = 'Email ou senha incorretos.';
          break;
        default:
          console.error("Erro de login não tratado:", error.code, error.message);
          mensagem = 'Ocorreu um erro inesperado ao tentar fazer login.';
      }
      Alert.alert('Erro de Login', mensagem);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Login</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
        placeholderTextColor="#888"
      />
      <TextInput
        placeholder="Senha"
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
        style={styles.input}
        placeholderTextColor="#888"
      />

      {carregando ? (
        <ActivityIndicator size="large" color="#C8102E" style={styles.activityIndicator} />
      ) : (
        <View style={styles.buttonContainer}>
          <Button title="Entrar" onPress={logar} color="#C8102E" />
        </View>
      )}
    </View>
  );
}

// Seus estilos (styles) permanecem os mesmos...
const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  titulo: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#C8102E',
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 20,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonContainer: {
    marginTop: 10,
  },
  activityIndicator: {
    marginTop: 20,
  }
});