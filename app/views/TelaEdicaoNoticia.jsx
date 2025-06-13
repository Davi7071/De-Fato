import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Image
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../services/firebaseConfig';

export default function TelaEdicaoNoticia() {
  const { noticiaId } = useLocalSearchParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [imagemUrl, setImagemUrl] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [usuarioPodeEditarExcluir, setUsuarioPodeEditarExcluir] = useState(false);

  useEffect(() => {
    setMounted(true);
    console.log('TelaEdicaoNoticia montada. Noticia ID recebido:', noticiaId);
    return () => {
      setMounted(false);
      console.log('TelaEdicaoNoticia desmontada.');
    };
  }, []);

  const navigarParaTelaAnteriorOuFallback = () => {
    if (mounted) { // Adicionada verificação de mounted aqui também
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/views/TelaUltimasNoticias'); // Ajuste se necessário
        }
    }
  };

  useEffect(() => {
    if (!mounted) return;

    if (!noticiaId || typeof noticiaId !== 'string' || noticiaId.trim() === '') {
      console.error('[CarregarNoticia] ID da notícia inválido ou não fornecido:', noticiaId);
      Alert.alert('Erro Crítico', 'ID da notícia não fornecido ou inválido para carregar.');
      navigarParaTelaAnteriorOuFallback();
      return;
    }
    
    const carregarNoticia = async () => {
      console.log(`[CarregarNoticia] Iniciando para ID: ${noticiaId}`);
      if (!mounted) return;
      setCarregando(true);

      try {
        const user = auth.currentUser;
        if (!user) {
          console.log('[CarregarNoticia] Usuário não autenticado.');
          Alert.alert('Autenticação Necessária', 'Você precisa estar logado para acessar esta funcionalidade.');
          if (mounted) router.replace('/views/Login');
          return;
        }
        console.log('[CarregarNoticia] Usuário autenticado:', user.uid, 'Email:', user.email);

        const docRef = doc(db, 'noticias', noticiaId);
        const docSnap = await getDoc(docRef);

        if (!mounted) return;

        if (docSnap.exists()) {
          const dadosNoticia = docSnap.data();
          console.log('[CarregarNoticia] Dados da notícia carregados:', dadosNoticia);
          
          setTitulo(dadosNoticia.titulo || '');
          setConteudo(dadosNoticia.conteudo || '');
          setImagemUrl(dadosNoticia.imagemUrl || dadosNoticia.imagem || '');

          let podeAcessar = false;
          console.log(`[CarregarNoticia] Verificando permissão: user.uid (${user.uid}) vs dadosNoticia.autorId (${dadosNoticia.autorId})`);
          if (user.uid === dadosNoticia.autorId) {
            console.log('[CarregarNoticia] PERMISSÃO: Usuário é o autor.');
            podeAcessar = true;
          } else {
            console.log('[CarregarNoticia] Usuário NÃO é o autor. Verificando se é admin...');
            const userDocRef = doc(db, 'usuario', user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (!mounted) return; 

            if (userDocSnap.exists()) {
                console.log('[CarregarNoticia] Documento do usuário lido. Dados:', userDocSnap.data());
                if (userDocSnap.data().tipo === 'administrador') {
                    console.log('[CarregarNoticia] PERMISSÃO: Usuário é administrador.');
                    podeAcessar = true;
                } else {
                    console.log('[CarregarNoticia] NEGADO: Tipo do usuário não é "administrador". Tipo é:', userDocSnap.data().tipo);
                }
            } else {
              console.log('[CarregarNoticia] NEGADO: Documento do usuário para verificação de admin não encontrado.');
            }
          }
          
          setUsuarioPodeEditarExcluir(podeAcessar);
          if (!podeAcessar) {
            // Alert.alert('Acesso Negado', 'Você não tem permissão para modificar esta notícia.');
            // A renderização condicional já trata isso, evitando o alerta aqui para não ser repetitivo se a tela bloquear.
          }

        } else {
          console.log('[CarregarNoticia] Notícia não encontrada no Firestore.');
          Alert.alert('Erro', 'Notícia não encontrada.');
          navigarParaTelaAnteriorOuFallback();
        }
      } catch (error) {
        console.error('[CarregarNoticia] Erro ao carregar notícia para edição:', error);
        if (mounted) {
          Alert.alert('Erro no Servidor', 'Não foi possível carregar os detalhes da notícia.');
          navigarParaTelaAnteriorOuFallback();
        }
      } finally {
        if (mounted) setCarregando(false);
      }
    };

    carregarNoticia();
  }, [noticiaId, mounted]);

  const salvarNoticia = async () => {
    // ... (função salvarNoticia como na sua última versão, com verificações e logs)
    if (!titulo.trim() || !conteudo.trim()) {
      Alert.alert('Atenção', 'Título e conteúdo não podem estar vazios.');
      return;
    }
    if (!usuarioPodeEditarExcluir) {
      Alert.alert('Acesso Negado', 'Você não tem permissão para salvar alterações.');
      return;
    }

    if (!mounted) return;
    setSalvando(true);
    try {
      const docRef = doc(db, 'noticias', noticiaId);
      const dadosAtualizados = {
        titulo: titulo.trim(),
        conteudo: conteudo.trim(),
        imagemUrl: imagemUrl.trim(),
        atualizadoEm: serverTimestamp(),
      };
      console.log('[salvarNoticia] Atualizando com dados:', dadosAtualizados);
      await updateDoc(docRef, dadosAtualizados);

      Alert.alert('Sucesso', 'Notícia atualizada com sucesso!');
      if (mounted) router.back();
    } catch (error) {
      console.error('[salvarNoticia] Erro ao atualizar notícia:', error);
      Alert.alert('Erro ao Salvar', `Não foi possível salvar as alterações: ${error.message}`);
    } finally {
      if (mounted) setSalvando(false);
    }
  };

  const handleExcluirNoticia = async () => {
    console.log('[handleExcluirNoticia] Função chamada. ID:', noticiaId, 'Pode excluir?:', usuarioPodeEditarExcluir);
    if (!usuarioPodeEditarExcluir) {
      Alert.alert('Acesso Negado', 'Você não tem permissão para excluir esta notícia.');
      return;
    }
    if (!noticiaId) {
        Alert.alert('Erro', 'ID da notícia inválido para exclusão.');
        return;
    }
    
    const user = auth.currentUser; // Re-verificar usuário aqui pode ser uma boa prática
    if (!user) {
        Alert.alert('Erro de Autenticação', 'Sua sessão pode ter expirado. Por favor, faça login novamente.');
        if (mounted) router.replace('/views/Login');
        return;
    }

    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir esta notícia permanentemente? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => console.log('[handleExcluirNoticia] Exclusão cancelada.') },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            if (!mounted) return;
            setExcluindo(true);
            console.log(`[handleExcluirNoticia] Confirmado para excluir. ID: ${noticiaId}`);
            try {
              const docRef = doc(db, 'noticias', noticiaId);
              console.log('[handleExcluirNoticia] Referência do Documento para deletar:', docRef.path);
              await deleteDoc(docRef);
              Alert.alert('Sucesso', 'Notícia excluída com sucesso!');
              if (mounted) router.replace('/views/TelaUltimasNoticias'); // Ajuste conforme necessário
            } catch (error) {
              console.error('[handleExcluirNoticia] ERRO DETALHADO AO EXCLUIR:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
              let firebaseErrorMessage = error.message;
              if (error.code) {
                firebaseErrorMessage += ` (Código: ${error.code})`;
              }
              Alert.alert('Erro ao Excluir', `Não foi possível excluir a notícia: ${firebaseErrorMessage}`);
            } finally {
              if (mounted) setExcluindo(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (carregando) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#B00000" />
        <Text style={styles.loadingText}>Carregando notícia...</Text>
      </View>
    );
  }

  if (!usuarioPodeEditarExcluir) { 
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Você não tem permissão para acessar ou modificar esta notícia.</Text>
        <TouchableOpacity style={styles.buttonVoltar} onPress={navigarParaTelaAnteriorOuFallback}>
          <Text style={styles.buttonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Editar Notícia</Text>

      <Text style={styles.label}>Título</Text>
      <TextInput
        placeholder="Título da notícia"
        value={titulo}
        onChangeText={setTitulo}
        style={styles.input}
        // editable={usuarioPodeEditarExcluir} // Já coberto pelo bloqueio de tela
      />

      <Text style={styles.label}>Conteúdo</Text>
      <TextInput
        placeholder="Conteúdo da notícia"
        value={conteudo}
        onChangeText={setConteudo}
        multiline
        style={[styles.input, styles.textArea]}
        // editable={usuarioPodeEditarExcluir}
      />

      <Text style={styles.label}>URL da Imagem (Opcional)</Text>
      <TextInput
        placeholder="https://exemplo.com/imagem.jpg"
        value={imagemUrl}
        onChangeText={setImagemUrl}
        style={styles.input}
        keyboardType="url"
        autoCapitalize="none"
        // editable={usuarioPodeEditarExcluir}
      />

      {imagemUrl && imagemUrl.trim().startsWith('http') ? (
         <Image 
            source={{ uri: imagemUrl.trim() }} 
            style={styles.imagemPreview} 
            resizeMode="contain"
            onError={(e) => console.warn('Erro ao carregar imagem da URL:', e.nativeEvent.error)}
          />
      ) : null}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={salvarNoticia}
          style={[styles.button, styles.saveButton]}
          disabled={salvando || excluindo}
        >
          {salvando ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Salvar Alterações</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleExcluirNoticia}
          style={[styles.button, styles.deleteButton]}
          disabled={salvando || excluindo}
        >
          {excluindo ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Excluir Notícia</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Estilos (mantidos da sua versão anterior)
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginBottom: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#343a40',
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#495057',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#495057',
  },
  textArea: {
    minHeight: 150,
    textAlignVertical: 'top',
  },
  imagemPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 20,
    backgroundColor: '#e9ecef',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 48,
  },
  saveButton: {
    backgroundColor: '#28a745',
    marginRight: 5,
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    marginLeft: 5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonVoltar: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
  }
});