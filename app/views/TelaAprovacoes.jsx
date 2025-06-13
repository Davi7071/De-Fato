import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Button, StyleSheet, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../services/firebaseConfig'; // Certifique-se que este caminho está correto
// import { getAuth } from 'firebase/auth'; // Não é usado diretamente neste componente, pode ser removido se não houver planos para verificações de cliente aqui

export default function TelaValidarUsuarios() {
  const [usuariosPendentes, setUsuariosPendentes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const carregarPendentes = useCallback(async () => {
    setLoading(true);
    setError(null);
    console.log('Tentando carregar usuários pendentes...');

    try {
      const q = query(collection(db, 'usuario'), where('status', '==', 'pendente'));
      const snapshot = await getDocs(q);

      console.log('Snapshot recebido. Número de documentos:', snapshot.size);

      const lista = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Log de cada documento lido
        console.log(`LIDO Documento ID: ${docSnap.id}, Status: ${data.status}, Tipo: ${data.tipo}, Email: ${data.email || data.email1}`);
        // A condição if (data.status !== 'aprovado') é redundante aqui se a query já é where('status', '==', 'pendente')
        // mas a manteremos caso a query mude ou para clareza de que apenas não aprovados devem ir para a lista de pendentes.
        if (data.status === 'pendente') { // Mais específico para a query atual
            lista.push({ id: docSnap.id, ...data });
        }
      });
      setUsuariosPendentes(lista);
      if (lista.length === 0 && snapshot.size > 0) {
        console.log('Todos os usuários lidos com status "pendente" foram processados, mas a lista final de pendentes está vazia (verifique a lógica de filtragem se inesperado).');
      } else if (lista.length === 0 && snapshot.size === 0) {
        console.log('Nenhum usuário com status "pendente" encontrado no Firestore.');
      }
    } catch (e) {
      console.error('ERRO DETALHADO AO CARREGAR USUÁRIOS:', JSON.stringify(e, Object.getOwnPropertyNames(e))); // Log mais completo do erro
      setError(`Não foi possível carregar usuários. Verifique as permissões e a conexão. Erro: ${e.message}`);
      Alert.alert('Erro ao Carregar', `Não foi possível carregar usuários. Detalhe: ${e.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregarPendentes();
  }, [carregarPendentes]);

  const validarUsuario = async (id, novoStatus, novoTipo) => {
    // O Alert.alert original foi removido para este teste direto.
    // Se quiser mantê-lo, coloque a lógica abaixo dentro do onPress do botão "Confirmar" do Alert.
    console.log(`--- INICIANDO validarUsuario para ID: ${id}, Status Novo: ${novoStatus}, Tipo Novo: ${novoTipo} ---`);
    setLoading(true); // Indica que a operação de validação está em progresso

    try {
      console.log(`[VALIDAR_USUARIO] Tentando atualizar ID: ${id} para Status: ${novoStatus}, Tipo: ${novoTipo}`);
      const userDocRef = doc(db, 'usuario', id);
      console.log(`[VALIDAR_USUARIO] Referência do documento: ${userDocRef.path}`);

      await updateDoc(userDocRef, {
        status: novoStatus,
        tipo: novoTipo,
      });

      console.log('<<<< [VALIDAR_USUARIO] SUCESSO DO CLIENTE: updateDoc completado sem lançar erro >>>>');
      Alert.alert('Sucesso (Teste)', `Usuário ${id} deveria ter sido atualizado para ${novoStatus}/${novoTipo}. Verifique o banco.`);
      
      // Recarrega a lista para refletir a mudança
      // setLoading(false) será chamado pelo finally de carregarPendentes
      carregarPendentes(); 

    } catch (e) {
      console.error('<<<< [VALIDAR_USUARIO] ERRO NO updateDoc DENTRO DO CATCH >>>>:', JSON.stringify(e, Object.getOwnPropertyNames(e))); // Log mais completo do erro
      Alert.alert('Erro na Validação (Teste)', `Falha ao atualizar usuário ${id}. Erro: ${e.message}`);
      setLoading(false); // Certifique-se de desativar o loading em caso de erro na validação
    }
    // Não é necessário um finally aqui para setLoading(false) se carregarPendentes() for chamado no sucesso,
    // pois carregarPendentes() tem seu próprio finally. Se carregarPendentes() não fosse chamado no sucesso,
    // um finally aqui para setLoading(false) seria importante.
  };

  useEffect(() => {
    carregarPendentes();
  }, [carregarPendentes]);

  // Lógica de renderização (if loading, if error, FlatList) permanece a mesma...
  if (loading && usuariosPendentes.length === 0 && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#B00000" />
        <Text style={styles.loadingText}>Carregando usuários pendentes...</Text>
      </View>
    );
  }

  if (error && usuariosPendentes.length === 0) { // Mostra erro apenas se não houver usuários para exibir
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Tentar Novamente" onPress={carregarPendentes} color="#B00000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Usuários Pendentes de Aprovação</Text>
      {usuariosPendentes.length === 0 && !loading ? ( // Mostra "nenhum pendente" apenas se não estiver carregando e a lista estiver vazia
        <Text style={styles.nenhum}>Nenhum usuário pendente no momento.</Text>
      ) : (
        <FlatList
          data={usuariosPendentes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.userInfo}>Email: {item.email || item.email1}</Text>
              <Text style={styles.userInfo}>Status Atual: {item.status}</Text>
              <Text style={styles.userInfo}>Tipo Atual: {item.tipo}</Text>
              <View style={styles.botoesContainer}>
                <View style={styles.botaoWrapper}>
                  <Button
                    title="Aprovar como Jornalista"
                    onPress={() => validarUsuario(item.id, 'aprovado', 'jornalista')}
                    color="#28a745"
                  />
                </View>
                <View style={styles.botaoWrapper}>
                  <Button
                    title="Aprovar como Administrador"
                    color="#007bff"
                    onPress={() => validarUsuario(item.id, 'aprovado', 'administrador')}
                  />
                </View>
              </View>
            </View>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#B00000"]}/>}
        />
      )}
    </View>
  );
}

// Seus estilos (styles) permanecem os mesmos...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  errorText: {
    marginBottom: 20,
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 25,
    color: '#343a40',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    fontSize: 16,
    marginBottom: 8,
    color: '#495057',
  },
  botoesContainer: {
    marginTop: 15,
  },
  botaoWrapper: {
    marginBottom: 10,
  },
  nenhum: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 17,
    color: '#6c757d',
  },
});