import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function TopDropDownMenu() {
  const [abaAtiva, setAbaAtiva] = useState('MANCHETES');
  const router = useRouter();
  const [menuVisivel, setMenuVisivel] = useState(false);

  const navegar = (destino, nomeAba) => {
    setMenuVisivel(false);
    setAbaAtiva(nomeAba);
    router.push(destino);
  };

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.logo} onPress={() => navegar('/', 'MANCHETES')}>
          DeFATO
        </Text>
        <TouchableOpacity onPress={() => setMenuVisivel(!menuVisivel)}>
          <Text style={styles.menuBotao}>☰</Text>
        </TouchableOpacity>
      </View>

      {menuVisivel && (
        <View style={styles.menu}>
          <Text style={styles.menuItem} onPress={() => navegar('/', 'MANCHETES')}>Manchetes</Text>
          <Text style={styles.menuItem} onPress={() => navegar('../views/UltimasNoticias', 'ULTIMAS')}>Últimas Notícias</Text>
          <Text style={styles.menuItem} onPress={() => navegar('../views/ValidadorDeNoticia', 'VERIFICADOR')}>Verificador IA</Text>
          <Text style={styles.menuItem} onPress={() => navegar('../views/Login', 'LOGIN')}>Tela de Login</Text>
          <Text style={styles.menuItem} onPress={() => navegar('../views/TelaAprovacoes', 'APROVAÇÕES')}>Aprovações</Text>
          <Text style={styles.menuItem} onPress={() => navegar('../views/TelaPublicar', 'PUBLICAR')}>Publicar Notícia</Text>
          <Text style={styles.menuItem} onPress={() => navegar('../views/TelaCadastro', 'CADASTRO')}>Cadastro</Text>
          <Text style={styles.menuItem} onPress={() => navegar('../views/NoticiasParaEditar', 'EDITOR')}>Editor de Notícias</Text>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        <Pressable onPress={() => navegar('/', 'MANCHETES')}>
          <Text style={[styles.tab, abaAtiva === 'MANCHETES' && styles.tabAtiva]}>MANCHETES</Text>
        </Pressable>
        <Pressable onPress={() => navegar('../views/UltimasNoticias', 'ULTIMAS')}>
          <Text style={[styles.tab, abaAtiva === 'ULTIMAS' && styles.tabAtiva]}>ÚLTIMAS</Text>
        </Pressable>
        <Pressable onPress={() => navegar('../views/ValidadorDeNoticia', 'VERIFICADOR')}>
          <Text style={[styles.tab, abaAtiva === 'VERIFICADOR' && styles.tabAtiva]}>VERIFICADOR IA</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#C8102E',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  menuBotao: {
    color: '#fff',
    fontSize: 26,
  },
  menu: {
    backgroundColor: '#eee',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  menuItem: {
    fontSize: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    color: '#333',
  },
  tabs: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
  },
  tab: {
    marginRight: 20,
    fontSize: 16,
    color: '#777',
  },
  tabAtiva: {
    color: '#C8102E',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});