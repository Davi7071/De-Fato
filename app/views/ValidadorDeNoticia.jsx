import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Linking, StyleSheet } from 'react-native';
import axios from 'axios';

const OPENROUTER_API_KEY = '';

export default function VerificadorIA() {
  const [texto, setTexto] = useState('');
  const [respostaIA, setRespostaIA] = useState(null); 
  const [respostaVerificacao, setRespostaVerificacao] = useState(null); 
  const [carregando, setCarregando] = useState(false);
  const [modo, setModo] = useState('');

  
  const enviarParaIAOriginal = async (tipo) => {
    setCarregando(true);
    setRespostaIA(null);
    setRespostaVerificacao(null); 
    setModo(tipo);
    const promptOriginal = tipo === 'verificar'
      ? `Leia a seguinte notícia e diga se é verdadeira ou falsa, explicando de forma breve:\n\n${texto}`
      : `Resuma a seguinte notícia em poucas linhas de forma clara:\n\n${texto}`;

    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'openai/gpt-3.5-turbo',
          messages: [{ role: 'user', content: promptOriginal }],
        },
        {
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const content = response.data.choices[0].message.content;
      setRespostaIA(content);
    } catch (error) {
      console.error('Erro ao processar com IA (original):', error.response ? error.response.data : error.message);
      setRespostaIA('Erro ao processar a notícia com IA. Tente novamente.');
    }
    setCarregando(false);
  };

  // Nova função para verificar fato (Verdadeiro/Falso)
  const realizarVerificacaoFactual = async () => {
    if (texto.trim() === '') {
      setRespostaVerificacao('Digite uma afirmação para verificar.');
      return;
    }
    setCarregando(true);
    setRespostaIA(null); // Limpar outra resposta
    setRespostaVerificacao(null);
    setModo('verificarFato');

    // Prompt específico para obter uma resposta Verdadeiro/Falso
    const promptVerdadeiroFalso = `Analise a seguinte afirmação e determine se ela é predominantemente verdadeira ou falsa. Responda começando com "Verdadeiro:" ou "Falso:" e adicione uma explicação muito breve e concisa. Se não for possível determinar com um bom grau de certeza, responda "Não foi possível determinar:". Afirmação: "${texto}"`;

    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'openai/gpt-3.5-turbo', // Pode testar outros modelos se quiser
          messages: [{ role: 'user', content: promptVerdadeiroFalso }],
        },
        {
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const aiContent = response.data.choices[0].message.content;
      setRespostaVerificacao(aiContent);

    } catch (error) {
      console.error('Erro na verificação factual com IA:', error.response ? error.response.data : error.message);
      setRespostaVerificacao('Erro ao processar a verificação factual. Tente novamente.');
    }
    setCarregando(false);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>
        Analisador de Textos com IA
      </Text>

      <TextInput
        multiline
        numberOfLines={6}
        placeholder="Cole o texto da notícia, afirmação para verificar, ou termo para resumir..."
        placeholderTextColor="#777"
        value={texto}
        onChangeText={setTexto}
        style={styles.textInput}
      />

      <View style={styles.buttonRow}>
        <TouchableOpacity
          onPress={() => enviarParaIAOriginal('verificar')}
          disabled={carregando || texto.trim() === ''}
          style={[styles.button, styles.buttonFlex, { marginRight: 5, backgroundColor: '#B00000' }]}
        >
          {carregando && modo === 'verificar' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Analisar Notícia (IA)</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => enviarParaIAOriginal('resumir')}
          disabled={carregando || texto.trim() === ''}
          style={[styles.button, styles.buttonFlex, { marginLeft: 5, backgroundColor: '#B00000' }]}
        >
          {carregando && modo === 'resumir' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Resumir (IA)</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Botão para a nova funcionalidade Verdadeiro/Falso */}
      <TouchableOpacity
        onPress={realizarVerificacaoFactual}
        disabled={carregando || texto.trim() === ''}
        style={[styles.button, { marginTop: 10, backgroundColor: '#006400' }]} // Cor diferente para destaque
      >
        {carregando && modo === 'verificarFato' ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Verificar Afirmação: V/F (IA)</Text>
        )}
      </TouchableOpacity>

      {/* Exibição da Resposta da IA Original */}
      {respostaIA && (
        <View style={[styles.responseContainer, { borderLeftColor: '#B00000'}]}>
          <Text style={styles.responseText}>{respostaIA}</Text>
        </View>
      )}

      {/* Exibição da Resposta da Verificação Factual (Verdadeiro/Falso) */}
      {respostaVerificacao && (
        <View style={[styles.responseContainer, { borderLeftColor: '#006400' }]}>
          <Text style={styles.responseText}>{respostaVerificacao}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0', // Fundo um pouco diferente
    padding: 20,
  },
  title: {
    fontSize: 24, // Aumentado
    fontWeight: 'bold',
    color: '#333', // Cor mais neutra
    marginBottom: 25,
    textAlign: 'center',
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 8, // Bordas mais suaves
    padding: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    textAlignVertical: 'top',
    fontSize: 16,
    marginBottom: 20,
    minHeight: 120,
    elevation: 2, // Sombra leve
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  button: {
    paddingVertical: 15, // Mais padding
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
  },
  buttonFlex: {
    flex: 1,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600', // Semi-bold
    fontSize: 15,
  },
  responseContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginTop: 25, // Mais espaço
    borderLeftWidth: 5, // Borda lateral mais grossa
    elevation: 2,
  },
  responseText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  // Não são mais necessários estilos específicos de searchResultItem, searchResultTitle, etc.
  // errorText e infoText podem ser incorporados no responseText ou ter estilos gerais se necessário.
});