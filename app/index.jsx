import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from './services/firebaseConfig.js';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'expo-router';

// Obtém a instância do Firestore a partir do app
import { getFirestore } from 'firebase/firestore';
const db = getFirestore(app);

export default function ManchetesScreen() {
  const router = useRouter();
  const [manchetes, setManchetes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [usuarioAdmin, setUsuarioAdmin] = useState(false);

  const carregarManchetes = async () => {
    try {
      setError('');
      setLoading(true);

      const q = query(
        collection(db, 'noticias'),
        orderBy('visualizacoes', 'desc'), // Ordena por visualizacoes decrescente
        limit(10)
      );

      const querySnapshot = await getDocs(q);
      const manchetesData = [];
      querySnapshot.forEach((doc) => {
        const dados = doc.data();
        manchetesData.push({
          id: doc.id,
          titulo: dados.titulo || 'Sem título',
          resumo: dados.conteudo || '',
          imagemUrl: dados.imagemUrl || dados.imagem || 'https://placehold.co/600x400/f0f2f5/c8102e?text=Notícia&font=roboto',
          criadoEm: dados.criadoEm?.toDate() || new Date(),
          autorNome: dados.autorNome || 'Redação',
          autorTipo: dados.autorTipo || 'jornalista',
          visualizacoes: dados.visualizacoes || 0,
          curtidas: dados.curtidas || 0,
          pontuacao: dados.pontuacao || 0,
          status: dados.status || 'publicado',
        });
      });
      setManchetes(manchetesData);
    } catch (err) {
      console.error('Erro ao carregar manchetes:', err);
      if (err.code === 'permission-denied') {
        setError("Permissão negada para ler as notícias.");
      } else if (err.code === 'failed-precondition') {
        setError("Consulta requer um índice. Verifique o console do Firebase.");
      } else {
        setError('Erro ao carregar manchetes. Tente novamente.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const verificarPermissaoUsuario = async (user) => {
    if (!user) {
      setUsuarioAdmin(false);
      return;
    }
    try {
      const docRef = doc(db, 'usuario', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const dados = docSnap.data();
        setUsuarioAdmin(dados.tipo === 'admin' && dados.status === 'aprovado');
      } else {
        setUsuarioAdmin(false);
      }
    } catch (error) {
      console.error('Erro ao verificar permissão:', error);
      setUsuarioAdmin(false);
    }
  };

  useEffect(() => {
    carregarManchetes();
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      verificarPermissaoUsuario(user);
    });
    return () => unsubscribe();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    carregarManchetes();
    const auth = getAuth();
    verificarPermissaoUsuario(auth.currentUser);
  };

  function renderMancheteItem({ item }) {
    return (
      <TouchableOpacity
        style={styles.cardManchete}
        onPress={() =>
          router.push({
            pathname: '/views/TelaNoticiaDetalhe',
            params: { noticiaId: item.id },
          })
        }
      >
        {item.imagemUrl && (
          <Image
            source={{ uri: item.imagemUrl }}
            style={styles.imagemManchete}
            resizeMode="cover"
          />
        )}
        <View style={styles.conteudoManchete}>
          <Text style={styles.tituloManchete} numberOfLines={2}>
            {item.titulo}
          </Text>
          <Text style={styles.resumoManchete} numberOfLines={3}>
            {item.resumo}
          </Text>
          <Text style={styles.infoManchete}>
            Por {item.autorNome} •{' '}
            {formatDistanceToNow(item.criadoEm, {
              addSuffix: true,
              locale: ptBR,
            })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading && manchetes.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C8102E" />
        <Text style={styles.loadingText}>Carregando manchetes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.tituloPrincipal}>MANCHETES</Text>
      <FlatList
        data={manchetes}
        renderItem={renderMancheteItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listaContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#C8102E']}
            tintColor="#C8102E"
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Icon name="newspaper" size={50} color="#6c757d" />
              <Text style={styles.emptyText}>
                {error || 'Nenhuma manchete encontrada no momento.'}
              </Text>
            </View>
          ) : null
        }
      />
      {usuarioAdmin && (
        <TouchableOpacity
          style={styles.botaoNovaNoticia}
          onPress={() => router.push('/views/TelaPublicarNoticia')}
        >
          <Icon name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  tituloPrincipal: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#C8102E',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#C8102E',
    fontSize: 16,
  },
  listaContainer: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    paddingBottom: 80,
  },
  cardManchete: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imagemManchete: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: '#e9ecef',
  },
  conteudoManchete: {
    padding: 14,
  },
  tituloManchete: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1c1e21',
    marginBottom: 6,
    lineHeight: 24,
  },
  resumoManchete: {
    fontSize: 14,
    color: '#4b4f56',
    marginBottom: 10,
    lineHeight: 20,
  },
  infoManchete: {
    fontSize: 12,
    color: '#6c757d',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 12,
    textAlign: 'center',
  },
  botaoNovaNoticia: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#C8102E',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
