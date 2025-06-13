import React, { useState } from 'react';
import {
  View,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator, // Adicionado para feedback de carregamento
} from 'react-native';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth, db } from '../services/firebaseConfig'; // db importado aqui
// 👇 Importações necessárias do Firestore
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'expo-router';

export default function Cadastro() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [tipo, setTipo] = useState('jornalista'); // Padrão para jornalista
  const [carregando, setCarregando] = useState(false); // Estado de carregamento
  const router = useRouter();

  const cadastrarUsuario = async () => {
    if (!email || !senha) {
      Alert.alert('Erro de Cadastro', 'Por favor, preencha todos os campos de email e senha.');
      return;
    }
    // Adicionar validação de senha se desejar (ex: mínimo de caracteres)
    if (senha.length < 6) {
      Alert.alert('Senha Inválida', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setCarregando(true); // Ativa o indicador de carregamento

    try {
      // 1. Cria o usuário no Firebase Authentication
      const credenciais = await createUserWithEmailAndPassword(auth, email, senha);
      const user = credenciais.user;

      console.log('Usuário criado no Auth com UID:', user.uid);

      // 2. Envia email de verificação (opcional, mas boa prática)
      await sendEmailVerification(user);
      console.log('Email de verificação enviado.');

      // 3. Salva dados adicionais do usuário no Firestore
      //    Usando setDoc com o UID do usuário como ID do documento
      const userDocRef = doc(db, 'usuario', user.uid); // Cria a referência ao documento
      console.log('Referência do documento no Firestore:', userDocRef.path);

      await setDoc(userDocRef, {
        uid: user.uid, // Redundante se o ID do documento já é o UID, mas pode ser útil
        email: user.email, // Usar o email verificado do objeto user
        tipo: tipo,
        status: 'pendente', // Novo usuário começa como pendente
        dataDeCriacao: serverTimestamp(), // Adiciona um timestamp de quando foi criado
        nomeCompleto: '', // Exemplo de campo adicional, peça ao usuário ou deixe para depois
      });
      console.log('Dados do usuário salvos no Firestore.');

      Alert.alert(
        'Cadastro Quase Concluído!',
        'Enviamos um email de verificação para sua conta. Por favor, verifique sua caixa de entrada (e spam) para ativar seu email. Após a verificação, seu cadastro aguardará a aprovação de um administrador.'
      );
      router.replace('/views/Login'); // Redireciona para Login após o cadastro

    } catch (error) {
      console.error("Erro detalhado ao cadastrar:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
      let mensagemErro = 'Ocorreu um erro desconhecido ao tentar cadastrar.';
      // Trata erros comuns do Firebase Auth
      switch (error.code) {
        case 'auth/email-already-in-use':
          mensagemErro = 'Este endereço de e-mail já está em uso por outra conta.';
          break;
        case 'auth/invalid-email':
          mensagemErro = 'O endereço de e-mail fornecido não é válido.';
          break;
        case 'auth/operation-not-allowed':
          mensagemErro = 'O cadastro com e-mail e senha não está habilitado. Contate o suporte.';
          break;
        case 'auth/weak-password':
          mensagemErro = 'A senha fornecida é muito fraca. Use pelo menos 6 caracteres.';
          break;
        default:
          mensagemErro = `Erro ao cadastrar: ${error.message}`; // Usa a mensagem padrão do Firebase para outros casos
      }
      Alert.alert('Falha no Cadastro', mensagemErro);
    } finally {
      setCarregando(false); // Desativa o indicador de carregamento em qualquer caso
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Criar Conta</Text>

      <TextInput
        placeholder="Seu melhor e-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
        placeholderTextColor="#888"
      />
      <TextInput
        placeholder="Crie uma senha (mín. 6 caracteres)"
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
        style={styles.input}
        placeholderTextColor="#888"
      />

      <Text style={styles.labelTipo}>Deseja se cadastrar como:</Text>
      <View style={styles.tipoContainer}>
        <TouchableOpacity
          style={[styles.tipoBotaoBase, tipo === 'jornalista' ? styles.tipoSelecionado : styles.tipoNaoSelecionado]}
          onPress={() => setTipo('jornalista')}
        >
          <Text style={[styles.tipoBotaoTextoBase, tipo === 'jornalista' ? styles.tipoTextoSelecionado : styles.tipoTextoNaoSelecionado]}>
            Jornalista
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tipoBotaoBase, tipo === 'administrador' ? styles.tipoSelecionado : styles.tipoNaoSelecionado]}
          onPress={() => setTipo('administrador')}
        >
          <Text style={[styles.tipoBotaoTextoBase, tipo === 'administrador' ? styles.tipoTextoSelecionado : styles.tipoTextoNaoSelecionado]}>
            Administrador
          </Text>
        </TouchableOpacity>
      </View>

      {carregando ? (
        <ActivityIndicator size="large" color="#C8102E" style={{ marginTop: 20 }}/>
      ) : (
        <View style={styles.buttonContainer}>
          <Button title="Criar Minha Conta" onPress={cadastrarUsuario} color="#C8102E" />
        </View>
      )}
        <TouchableOpacity onPress={() => router.push('/views/Login')} style={styles.loginLink}>
            <Text style={styles.loginLinkTexto}>Já tem uma conta? Faça login</Text>
        </TouchableOpacity>
    </View>
  );
}

// Estilos atualizados para melhor aparência
const styles = StyleSheet.create({
  container: {
    padding: 25, // Aumentado o padding
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#f8f9fa', // Cor de fundo mais suave
  },
  titulo: {
    fontSize: 28, // Aumentado
    fontWeight: 'bold',
    marginBottom: 35, // Aumentado
    color: '#C8102E',
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#fff', // Fundo branco para inputs
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 20,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ced4da', // Borda mais suave
  },
  labelTipo: {
    fontSize: 16,
    color: '#495057',
    marginBottom: 10,
    textAlign: 'center',
  },
  tipoContainer: {
    flexDirection: 'row',
    justifyContent: 'center', // Centralizado
    marginBottom: 35, // Aumentado
    gap: 15, // Espaço entre os botões
  },
  tipoBotaoBase: { // Estilo base para os botões de tipo
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
  },
  tipoSelecionado: {
    backgroundColor: '#C8102E',
    borderColor: '#C8102E',
  },
  tipoNaoSelecionado: {
    backgroundColor: 'transparent',
    borderColor: '#C8102E',
  },
  tipoBotaoTextoBase: { // Estilo base para o texto dos botões de tipo
    fontSize: 14,
    fontWeight: '600', // Semi-bold
    textAlign: 'center',
  },
  tipoTextoSelecionado: {
    color: '#fff',
  },
  tipoTextoNaoSelecionado: {
    color: '#C8102E',
  },
  buttonContainer: {
    marginTop: 10, // Espaço acima do botão principal
  },
  loginLink: {
    marginTop: 25,
  },
  loginLinkTexto: {
    color: '#007bff', // Cor de link
    textAlign: 'center',
    fontSize: 15,
  },
});