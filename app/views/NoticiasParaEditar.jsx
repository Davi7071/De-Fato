import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'expo-router';

export default function NoticiasParaEditar() {
  const [noticias, setNoticias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [usuarioEmail, setUsuarioEmail] = useState(null);
  const router = useRouter();
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user?.email) {
        setUsuarioEmail(user.email.toLowerCase());
      } else {
        setUsuarioEmail(null);
        router.back(); // Volta se não estiver logado
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const carregarNoticiasDoUsuario = async () => {
      if (!usuarioEmail) return;

      try {
        setCarregando(true);
        const q = query(
          collection(db, 'noticias'),
          orderBy('criadoEm', 'desc')
        );
        const snapshot = await getDocs(q);
        const noticiasUsuario = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((n) => n.autorEmail?.toLowerCase() === usuarioEmail);

        setNoticias(noticiasUsuario);
      } catch (error) {
        console.error('Erro ao carregar notícias: ', error);
        Alert.alert('Erro', 'Não foi possível carregar suas notícias.');
      } finally {
        setCarregando(false);
      }
    };

    carregarNoticiasDoUsuario();
  }, [usuarioEmail]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        router.push({
          pathname: 'views/TelaEdicaoNoticia',
          params: { noticiaId: item.id },
        })
      }
    >
      <Text style={styles.titulo}>{item.titulo}</Text>
      <Text style={styles.data}>
        Publicado em:{' '}
        {item.criadoEm
          ? new Date(item.criadoEm.seconds * 1000).toLocaleDateString()
          : 'Data indisponível'}
      </Text>
      {item.atualizadoEm && (
        <Text style={styles.data}>
          Atualizado em:{' '}
          {new Date(item.atualizadoEm.seconds * 1000).toLocaleDateString()}
        </Text>
      )}
    </TouchableOpacity>
  );

  if (!usuarioEmail && !carregando) {
    return (
      <View style={styles.containerCenter}>
        <Text>Você precisa estar logado para ver suas notícias.</Text>
      </View>
    );
  }

  if (carregando) {
    return (
      <View style={styles.containerCenter}>
        <ActivityIndicator size="large" color="#C8102E" />
        <Text>Carregando suas notícias...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={noticias}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      ListEmptyComponent={
        <View style={styles.containerCenter}>
          <Text style={styles.vazio}>
            Você ainda não publicou nenhuma notícia.
          </Text>
        </View>
      }
      contentContainerStyle={styles.lista}
    />
  );
}

const styles = StyleSheet.create({
  containerCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  lista: {
    padding: 16,
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
  },
  titulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  data: {
    fontSize: 12,
    color: '#777',
    marginTop: 3,
  },
  vazio: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
});
