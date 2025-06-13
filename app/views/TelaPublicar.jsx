import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
// Certifique-se de que o caminho para firebaseConfig está correto
import { db } from '../services/firebaseConfig';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
// Certifique-se de que o caminho para palavras-chave.json está correto
import frequenciasJson from '../../assets/palavras-chave.json';

const normalizeString = (str) =>
  str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function TelaBarViralidade() { // Ou TelaPublicar, se preferir
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [imagemUrlInput, setImagemUrlInput] = useState(''); // Para o input da URL da imagem
  const [autorNome, setAutorNome] = useState('');
  const [freqNormalized, setFreqNormalized] = useState({});
  const [maxPontuacao, setMaxPontuacao] = useState(1);
  const [pontuacao, setPontuacao] = useState(0);
  const [carregandoSubmit, setCarregandoSubmit] = useState(false);
  const [tipoUsuario, setTipoUsuario] = useState('');
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [authVerificada, setAuthVerificada] = useState(false);
  const [usuarioAutenticado, setUsuarioAutenticado] = useState(false);

  const auth = getAuth();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUsuarioAutenticado(true);
        let nomeAutorDisplay = user.displayName || '';
        try {
          const userDocRef = doc(db, 'usuario', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setTipoUsuario(userData.tipo || 'jornalista');
            if (!nomeAutorDisplay && userData.nomeCompleto) {
              nomeAutorDisplay = userData.nomeCompleto;
            } else if (!nomeAutorDisplay && !userData.nomeCompleto && user.email) {
              nomeAutorDisplay = user.email.split('@')[0];
            }
          } else {
            setTipoUsuario('jornalista');
            if (!nomeAutorDisplay && user.email) {
              nomeAutorDisplay = user.email.split('@')[0];
            }
          }
        } catch (error) {
          console.error("Erro ao carregar dados do usuário do Firestore:", error);
          setTipoUsuario('jornalista');
          if (!nomeAutorDisplay && user.email) {
            nomeAutorDisplay = user.email.split('@')[0];
          }
        }
        setAutorNome(nomeAutorDisplay);
      } else {
        setUsuarioAutenticado(false);
        setAutorNome('');
        setTipoUsuario('');
      }
      setAuthVerificada(true);
    });
    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    const normalizedMap = {};
    let total = 0;
    Object.entries(frequenciasJson).forEach(([orig, peso]) => {
      const key = normalizeString(orig);
      normalizedMap[key] = peso;
      total += peso;
    });
    setFreqNormalized(normalizedMap);
    setMaxPontuacao(total > 0 ? total : 1);
  }, []);

   useEffect(() => {
    if (!usuarioAutenticado) return;
    const normalizeAndSplit = (text) =>
      text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 0);
    const titleWords = normalizeAndSplit(titulo);
    const contentWords = normalizeAndSplit(conteudo);
    let soma = 0;
    titleWords.forEach((palavra) => {
      if (freqNormalized[palavra] !== undefined) {
        soma += freqNormalized[palavra] * 2;
      }
    });
    contentWords.forEach((palavra) => {
      if (freqNormalized[palavra] !== undefined) {
        soma += freqNormalized[palavra];
      }
    });
    setPontuacao(soma);
  }, [titulo, conteudo, freqNormalized, usuarioAutenticado]);

  useEffect(() => {
    if (!usuarioAutenticado || maxPontuacao <= 0) return;
    const basePercent = (pontuacao / maxPontuacao) * 100;
    const sensibilidade = 2.5;
    const novoPercent = Math.min(basePercent / sensibilidade, 100);
    Animated.timing(animatedValue, {
      toValue: novoPercent,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [pontuacao, maxPontuacao, animatedValue, usuarioAutenticado]);

  const larguraInterpolada = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const barColor = animatedValue.interpolate({
    inputRange: [0, 30, 70, 100],
    outputRange: ['#e53935', '#e53935', '#f57c00', '#43a047'],
  });

  const publicar = async () => {
    if (!titulo.trim() || !conteudo.trim()) {
      Alert.alert('Erro', 'Título e conteúdo são obrigatórios!');
      return;
    }

    if (imagemUrlInput.trim() && !imagemUrlInput.trim().startsWith('http')) {
        Alert.alert('Erro', 'Por favor, insira uma URL de imagem válida (começando com http ou https).');
        return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Erro de Autenticação', 'Você precisa estar logado para publicar! Redirecionando para login.');
      router.push('/views/Login'); // Ajuste o caminho se necessário
      return;
    }

    setCarregandoSubmit(true);
    console.log('[publicar] Iniciando processo de publicação com link de imagem...');

    try {
      const imagemParaSalvar = imagemUrlInput.trim() || '';

      await addDoc(collection(db, 'noticias'), {
        titulo: titulo.trim(),
        conteudo: conteudo.trim(),
        imagem: imagemParaSalvar,
        pontuacao,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
        visualizacoes: 0,
        curtidas: 0,
        autorId: user.uid,
        autorEmail: user.email,
        autorNome: autorNome.trim() || user.displayName || user.email?.split('@')[0] || 'Anônimo',
        autorTipo: tipoUsuario || 'jornalista',
        status: 'publicado',
        ...(tipoUsuario === 'admin' && {
          oficial: true,
          prioridade: 1,
        }),
      });

      Alert.alert('Sucesso', 'Notícia publicada com sucesso!');
      console.log('[publicar] Notícia publicada com sucesso no Firestore.');

      setTitulo('');
      setConteudo('');
      setImagemUrlInput('');
      setPontuacao(0);
    } catch (error) {
      console.error('[publicar] Erro geral ao publicar:', error);
      let errorMessage = 'Não foi possível publicar a notícia. ';
      if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Verifique sua conexão ou tente novamente.';
      }
      Alert.alert('Erro', errorMessage);
    } finally {
      setCarregandoSubmit(false);
      console.log('[publicar] Processo de publicação finalizado.');
    }
  };

  if (!authVerificada) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#2c3e50" />
        <Text style={styles.centeredText}>Verificando autenticação...</Text>
      </View>
    );
  }

  if (!usuarioAutenticado) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.authMessage}>Você precisa estar logado para acessar esta página.</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push('/views/Login')} // Ajuste o caminho se necessário
        >
          <Text style={styles.loginButtonText}>Ir para Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Nova Publicação</Text>

      {tipoUsuario && (
        <View style={[
          styles.badgeTipoUsuario,
          tipoUsuario === 'admin' ? styles.badgeAdmin : styles.badgeJornalista
        ]}>
          <Text style={styles.textoBadge}>
            {tipoUsuario.toUpperCase()}
          </Text>
        </View>
      )}

      <TextInput
        style={styles.input}
        value={titulo}
        onChangeText={setTitulo}
        placeholder="Digite o título da publicação..."
        placeholderTextColor="#999"
        maxLength={100}
      />

      <TextInput
        style={[styles.input, styles.textarea]}
        multiline
        numberOfLines={4}
        value={conteudo}
        onChangeText={setConteudo}
        placeholder="Digite o conteúdo da publicação..."
        placeholderTextColor="#999"
      />

      <TextInput
        style={styles.input}
        value={autorNome}
        onChangeText={setAutorNome}
        placeholder="Seu nome (como autor)"
        placeholderTextColor="#999"
        editable={!auth.currentUser?.displayName || (auth.currentUser.displayName !== autorNome)}
      />

      <TextInput
        style={styles.input}
        value={imagemUrlInput}
        onChangeText={setImagemUrlInput}
        placeholder="Cole a URL da imagem aqui (opcional)"
        placeholderTextColor="#999"
        keyboardType="url"
        autoCapitalize="none"
      />

      {imagemUrlInput.trim().startsWith('http') ? (
        <Image
          source={{ uri: imagemUrlInput.trim() }}
          style={styles.imagemPreview}
          resizeMode="cover"
          onError={(e) => {
            console.warn('Erro ao carregar imagem da URL:', e.nativeEvent.error);
            // Você pode querer limpar o campo ou mostrar um placeholder de erro
            // setImagemUrlInput(''); // Exemplo: limpa se der erro
            // Alert.alert("Erro", "Não foi possível carregar a imagem da URL fornecida.");
          }}
        />
      ) : null}

      <TouchableOpacity
        style={[
          styles.botaoPublicar,
          carregandoSubmit && styles.botaoDesabilitado
        ]}
        onPress={publicar}
        disabled={carregandoSubmit}
      >
        {carregandoSubmit ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.botaoPublicarTexto}>Publicar</Text>
        )}
      </TouchableOpacity>

      <View style={styles.viralContainer}>
        <Text style={styles.viralText}>
          Potencial de Viralidade: {Math.round(pontuacao)} pontos
        </Text>
        <View style={styles.barraFundo}>
          <Animated.View
            style={[
              styles.barra,
              {
                width: larguraInterpolada,
                backgroundColor: barColor,
              }
            ]}
          />
        </View>
        <Text style={styles.dicaViral}>
          Dica: Use palavras-chave relevantes no título e conteúdo para aumentar o alcance
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F8F8FF',
    flexGrow: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  centeredText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  authMessage: {
    fontSize: 18,
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    elevation: 3,
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#2c3e50',
  },
  badgeTipoUsuario: {
    alignSelf: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 15,
  },
  badgeAdmin: {
    backgroundColor: '#d32f2f',
  },
  badgeJornalista: {
    backgroundColor: '#1976d2',
  },
  textoBadge: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 15,
    fontSize: 16,
    color: '#333',
  },
  textarea: {
    height: 150,
    textAlignVertical: 'top',
  },
  botaoPublicar: {
    backgroundColor: '#2ecc71',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 3,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  botaoDesabilitado: {
    backgroundColor: '#95a5a6',
  },
  botaoPublicarTexto: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 5,
  },
  imagemPreview: {
    width: '100%',
    height: 200,
    marginBottom: 15,
    borderRadius: 8,
    backgroundColor: '#eee', // Cor de fundo enquanto a imagem carrega ou se falhar
  },
  viralContainer: {
    marginTop: 30,
    marginBottom: 20,
  },
  viralText: {            // Este é o bloco onde o erro de sintaxe foi indicado
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,     // A vírgula aqui é correta
    color: '#2c3e50',    // Certifique-se de que esta linha e as seguintes estão corretas
    textAlign: 'center',
  },                      // Esta vírgula é correta se houver mais estilos abaixo no mesmo nível
  dicaViral: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  barraFundo: {
    width: '100%',
    height: 20,
    backgroundColor: '#ecf0f1',
    borderRadius: 10,
    overflow: 'hidden',
  },
  barra: {
    height: '100%',
  },
});