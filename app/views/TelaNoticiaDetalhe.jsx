import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLocalSearchParams } from 'expo-router'; // 🚀 Alteração aqui

export default function TelaDetalhesNoticia() {
  const { noticiaId } = useLocalSearchParams(); // 🚀 Pegando o ID via useLocalSearchParams
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [curtindo, setCurtindo] = useState(false);

  useEffect(() => {
    const carregarDetalhes = async () => {
      try {
        const ref = doc(db, 'noticias', noticiaId);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const dadosAtualizados = snap.data();
          setDados({
            ...dadosAtualizados,
            id: snap.id,
            criadoEm: dadosAtualizados.criadoEm?.toDate() || new Date()
          });

          // Incrementar visualizações
          await updateDoc(ref, {
            visualizacoes: increment(1)
          });
        } else {
          Alert.alert('Erro', 'Notícia não encontrada.');
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
        Alert.alert('Erro', 'Não foi possível carregar os detalhes da notícia.');
      } finally {
        setCarregando(false);
      }
    };

    if (noticiaId) {
      carregarDetalhes();
    } else {
      Alert.alert('Erro', 'ID da notícia não encontrado.');
      setCarregando(false);
    }
  }, [noticiaId]);

  const curtirNoticia = async () => {
    if (curtindo || !dados) return;
    setCurtindo(true);
    try {
      const ref = doc(db, 'noticias', dados.id);
      await updateDoc(ref, {
        curtidas: increment(1)
      });
      setDados((prev) => ({ ...prev, curtidas: (prev.curtidas || 0) + 1 }));
    } catch (error) {
      console.error('Erro ao curtir:', error);
      Alert.alert('Erro', 'Não foi possível curtir a notícia.');
    } finally {
      setCurtindo(false);
    }
  };

  if (carregando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text>Carregando notícia...</Text>
      </View>
    );
  }

  if (!dados) {
    return (
      <View style={styles.loadingContainer}>
        <Icon name="error-outline" size={40} color="#999" />
        <Text style={{ color: '#999', marginTop: 10 }}>Notícia não encontrada.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {dados.imagem && <Image source={{ uri: dados.imagem }} style={styles.imagem} />}
      <Text style={styles.titulo}>{dados.titulo}</Text>
      <Text style={styles.jornalista}>Por {dados.jornalista || 'Jornalista desconhecido'}</Text>
      <Text style={styles.data}>
        {format(dados.criadoEm, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
      </Text>
      <Text style={styles.conteudo}>{dados.conteudo}</Text>

      <View style={styles.interacoes}>
        <TouchableOpacity onPress={curtirNoticia} style={styles.botaoInteracao}>
          <Icon name="thumb-up" size={20} color="#4285F4" />
          <Text style={styles.textoInteracao}>{dados.curtidas || 0}</Text>
        </TouchableOpacity>
        <View style={styles.botaoInteracao}>
          <Icon name="remove-red-eye" size={20} color="#888" />
          <Text style={styles.textoInteracao}>{dados.visualizacoes || 1}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagem: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 15,
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  jornalista: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#666',
  },
  data: {
    fontSize: 12,
    color: '#999',
    marginBottom: 20,
  },
  conteudo: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 30,
  },
  interacoes: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 20,
  },
  botaoInteracao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  textoInteracao: {
    fontSize: 14,
    color: '#333',
  },
});
